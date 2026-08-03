import { BaseCommand, flags } from "@adonisjs/core/ace";
import { AI_DIFFICULTIES, type AiDifficulty, type GameData } from "#api_types/game.types";
import { getDefaultGameData } from "#controllers/games/create_game";
import { performPassTurn } from "#controllers/games/pass_game_turn";
import { finalizeMulligan } from "#controllers/games/mulligan/finalize_mulligan";
import { ADVANCED_AI_DECKS } from "#database/seed_data/ai_decks";
import { ADVANCED_AI_DEFAULTS } from "#galaguerre/ai/advanced/advanced_ai_config";
import { EXPERT_AI_DEFAULTS } from "#galaguerre/ai/advanced/expert_ai_config";
import { decideNextMoves } from "#galaguerre/ai/advanced/decide_next_move";
import { decideExpertMoves } from "#galaguerre/ai/advanced/decide_expert_move";
import type { AiDecision } from "#galaguerre/ai/advanced/decide_next_move";
import { applyAiMove } from "#galaguerre/simulation/apply_ai_move";
import { createSimulationGame } from "#galaguerre/simulation/simulation_game";
import { performMulliganOnPlayer } from "#controllers/games/mulligan/perform_mulligan";
import { selectMulliganCardUuids } from "#galaguerre/ai/advanced/advanced_mulligan";
import { loadTrainingBotCards } from "#services/training/load_training_bot_cards";
import { takeSimulatedMoveCount } from "#galaguerre/simulation/simulation_metrics";
import { createSeededRng, runInSimulation } from "../app/utils/simulation_context.js";

/**
 * Banc d'essai du DÉBIT de la recherche, complémentaire de `dev:bench-ai`.
 *
 * `dev:bench-ai` répond à « cette IA est-elle plus forte ? », ce qui demande des centaines de
 * parties pour sortir du bruit. Celui-ci répond à « la recherche explore-t-elle plus de positions
 * par seconde ? », qui est la question posée par une optimisation — et qui se mesure, elle, sur
 * quelques positions.
 *
 *   node ace dev:bench-search --difficulty=EXPERT
 *
 * Les positions sont collectées sur une partie SEEDÉE : deux exécutions successives évaluent
 * exactement les mêmes états, sans quoi un écart de débit ne voudrait rien dire. C'est ce qui rend
 * les chiffres comparables avant / après un changement.
 */

const LEFT_USER_ID = -42;
const RIGHT_USER_ID = -43;
const MAX_ACTIONS_PER_TURN = 40;

/**
 * Budget de réflexion imposé, identique pour toutes les positions et bien au-dessus des réglages
 * de production. On veut mesurer un débit, pas re-mesurer le budget adaptatif : à budget libre,
 * une optimisation se traduirait par un temps constant et un nombre de nœuds variable, ce qui est
 * exactement le contraire de ce qu'on cherche à lire.
 */
const BENCH_THINK_MS = 3000;

/** Échéance hors d'atteinte pendant la collecte, pour que ce soit le plafond de nœuds qui borne. */
const COLLECTION_UNREACHABLE_DEADLINE_MS = 600_000;

/**
 * Croissance du journal par tour, relevée sur une partie réelle avant optimisation (1 entrée au
 * tour 1, 95 au tour 8). C'est le rythme auquel l'état que l'IA reçoit s'alourdit en production.
 */
const LOG_ENTRIES_PER_ROUND = 12;

interface Position {
    round: number;
    data: GameData;
    /** Taille JSON de l'état : c'est ce que `structuredClone` recopie à chaque nœud. */
    stateBytes: number;
    actionLogEntries: number;
}

interface Sample {
    round: number;
    nodes: number;
    ms: number;
    stateBytes: number;
    actionLogEntries: number;
}

const isAiDifficulty = (value: string): value is AiDifficulty =>
    (AI_DIFFICULTIES as readonly string[]).includes(value);

const median = (values: number[]): number => {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)]!;
};

export default class BenchSearch extends BaseCommand {
    static commandName = "dev:bench-search";
    static description = "Measure AI search throughput (nodes/s) on reproducible positions";
    static options = { startApp: true };

    @flags.string({
        description: `Difficulty to profile (${AI_DIFFICULTIES.filter((d) => d !== "BEGINNER").join(" | ")})`,
        default: "EXPERT",
    })
    declare difficulty: string;

    @flags.number({ description: "Rounds to play when collecting positions", default: 14 })
    declare rounds: number;

    @flags.number({ description: "Seed of the collected game", default: 7 })
    declare seed: number;

    async run() {
        const difficulty = this.difficulty.toUpperCase();

        if (!isAiDifficulty(difficulty) || difficulty === "BEGINNER") {
            this.logger.error("--difficulty must be ADVANCED or EXPERT");
            this.exitCode = 1;
            return;
        }

        const positions = await this.collectPositions();

        if (positions.length === 0) {
            this.logger.error("No position collected — the game ended too early");
            this.exitCode = 1;
            return;
        }

        this.largestPosition = positions.reduce((largest, position) =>
            position.stateBytes > largest.stateBytes ? position : largest,
        );

        this.logger.info(`${positions.length} positions collected, profiling ${difficulty}...`);

        const samples: Sample[] = [];

        for (const position of positions) {
            takeSimulatedMoveCount();
            const decision = await this.decide(position.data, difficulty);

            samples.push({
                round: position.round,
                // Le compteur global, et non `decision.nodesExplored` : lui ne voit que le
                // faisceau principal, alors que le temps écoulé, lui, couvre tout.
                nodes: takeSimulatedMoveCount(),
                ms: decision.elapsedMs,
                stateBytes: position.stateBytes,
                actionLogEntries: position.actionLogEntries,
            });
        }

        this.report(samples, difficulty);
    }

    private decide(data: GameData, difficulty: AiDifficulty): Promise<AiDecision> {
        // Graine fixe : le débit doit être lu sur une recherche reproductible, pas sur un tirage.
        const seed = 1234;

        if (difficulty === "EXPERT") {
            return decideExpertMoves(data, {
                aiUserId: LEFT_USER_ID,
                opponentUserId: RIGHT_USER_ID,
                profile: "MIDRANGE",
                config: { ...EXPERT_AI_DEFAULTS, maxThinkMs: BENCH_THINK_MS, minThinkMs: 0 },
                seed,
            });
        }

        return decideNextMoves(data, {
            aiUserId: LEFT_USER_ID,
            profile: "MIDRANGE",
            config: { ...ADVANCED_AI_DEFAULTS, maxThinkMs: BENCH_THINK_MS, minThinkMs: 0 },
            seed,
        });
    }

    /**
     * Déroule une partie Avancé contre Avancé et retient l'état au DÉBUT de chaque tour du camp
     * gauche. On profile ainsi des positions de milieu et de fin de partie — plateau garni, main
     * pleine, `actionLog` long — c'est-à-dire là où la recherche coûte réellement, et pas le
     * tour 1 à deux coups légaux qui ne dit rien.
     */
    private async collectPositions(): Promise<Position[]> {
        const deck = ADVANCED_AI_DECKS[0]!;
        const cards = await loadTrainingBotCards(deck.recipe);

        const leftPlayer = {
            userId: LEFT_USER_ID,
            pseudo: "left",
            avatarCardId: 1,
            cards,
        };
        const rightPlayer = {
            userId: RIGHT_USER_ID,
            pseudo: "right",
            avatarCardId: 1,
            cards: await loadTrainingBotCards(deck.recipe),
        };

        return runInSimulation({ rng: createSeededRng(this.seed) }, async () => {
            const data = getDefaultGameData({
                playerOne: leftPlayer,
                playerTwo: rightPlayer,
                isTraining: true,
            });

            const game = createSimulationGame(data);

            for (const player of [game.data.playerOne, game.data.playerTwo]) {
                performMulliganOnPlayer(player, selectMulliganCardUuids(player, deck.profile));
            }

            await finalizeMulligan(game);

            const positions: Position[] = [];

            while (!game.isFinished && game.data.currentRound <= this.rounds) {
                if (
                    game.data.state !== "PLAYER_ONE_TURN" &&
                    game.data.state !== "PLAYER_TWO_TURN"
                ) {
                    break;
                }

                const activeIsLeft = game.data.state === "PLAYER_ONE_TURN";

                if (activeIsLeft) {
                    const withLog = this.withRealisticActionLog(game.data);
                    const serialized = JSON.stringify(withLog);

                    positions.push({
                        round: withLog.currentRound,
                        data: JSON.parse(serialized) as GameData,
                        stateBytes: serialized.length,
                        actionLogEntries: withLog.actionLog.length,
                    });
                }

                await this.playTurnQuickly(game, activeIsLeft ? LEFT_USER_ID : RIGHT_USER_ID);

                if (game.isFinished) break;

                const activePlayer = activeIsLeft ? game.data.playerOne : game.data.playerTwo;
                await performPassTurn(game, activePlayer);
            }

            return positions;
        });
    }

    /**
     * Redonne à une position collectée le journal qu'elle aurait en production.
     *
     * La collecte tourne sous `runInSimulation`, où l'enregistrement du journal est désactivé :
     * les positions en sortent donc avec un `actionLog` vide. Or en partie réelle l'IA reçoit un
     * état venu de la base, dont le journal a grossi depuis le premier tour — c'est précisément
     * l'entrée que la recherche doit encaisser. Mesurer sur un journal vide reviendrait à mesurer
     * l'optimisation sur un cas qu'elle a elle-même créé.
     *
     * Les entrées sont bâties comme les vraies (`recordPlayCard` embarque un `structuredClone` de
     * la carte jouée) : c'est ce contenu qui fait le poids du journal, pas le nombre de lignes.
     */
    private withRealisticActionLog(data: GameData): GameData {
        const template = data.playerOne.deckCards[0] ?? data.playerOne.hand[0];
        if (!template) return data;

        const entryCount = LOG_ENTRIES_PER_ROUND * data.currentRound;
        const actionLog = Array.from({ length: entryCount }, (_, index) => ({
            id: `bench-log-${index}`,
            roundNumber: Math.floor(index / LOG_ENTRIES_PER_ROUND) + 1,
            playerId: index % 2 === 0 ? data.playerOne.userId : data.playerTwo.userId,
            type: "PLAY_CARD" as const,
            card: structuredClone(template),
        }));

        return { ...data, actionLog };
    }

    /**
     * Tour joué avec un budget minuscule : on collecte des positions, on ne mesure pas ici.
     *
     * Le budget est borné en NŒUDS, pas en temps. Une borne temporelle rendrait la collecte
     * dépendante de la vitesse du code : une optimisation ferait explorer plus de coups dans les
     * mêmes 60 ms, l'IA jouerait autrement, et l'on comparerait alors deux jeux de positions
     * différents en croyant comparer deux débits. Borné en nœuds, le déroulé est identique avant
     * et après — c'est la condition pour que le chiffre veuille dire quelque chose.
     */
    private async playTurnQuickly(
        game: ReturnType<typeof createSimulationGame>,
        aiUserId: number,
    ): Promise<void> {
        for (let action = 0; action < MAX_ACTIONS_PER_TURN; action++) {
            if (game.isFinished || game.data.pendingDiscover) break;

            const decision = await decideNextMoves(game.data, {
                aiUserId,
                profile: "MIDRANGE",
                config: {
                    ...ADVANCED_AI_DEFAULTS,
                    maxNodes: 120,
                    maxThinkMs: COLLECTION_UNREACHABLE_DEADLINE_MS,
                    minThinkMs: 0,
                },
                seed: this.seed * 100 + action,
            });

            if (decision.moves.length === 0) break;

            const result = await applyAiMove(game.data, aiUserId, decision.moves[0]!);
            if (!result.applied) break;

            game.data = result.data;

            if (result.finished) {
                game.isFinished = true;
                break;
            }
        }
    }

    private declare largestPosition: Position;

    /**
     * Ventile les octets recopiés à chaque nœud. C'est la carte qui dit quoi optimiser : une
     * structure qui pèse 40 % du clone et que le moteur ne relit jamais est un gain immédiat,
     * là où gagner 10 % sur le plateau ne se verrait pas.
     */
    private breakdown(position: Position): [string, number][] {
        const { data } = position;
        const size = (value: unknown): number => JSON.stringify(value ?? null).length;

        const perPlayer = (key: "deckCards" | "hand" | "board") =>
            size(data.playerOne[key]) + size(data.playerTwo[key]);

        return [
            ["actionLog", size(data.actionLog)],
            ["deckCards (x2)", perPlayer("deckCards")],
            ["hand (x2)", perPlayer("hand")],
            ["board (x2)", perPlayer("board")],
            [
                "goldenCardIds (x2)",
                size(data.playerOne.ownedGoldenCardIds) + size(data.playerTwo.ownedGoldenCardIds),
            ],
            [
                "startingDeck (x2)",
                size(data.playerOne.startingDeckCardIds) + size(data.playerTwo.startingDeckCardIds),
            ],
        ].sort((a, b) => (b[1] as number) - (a[1] as number)) as [string, number][];
    }

    private report(samples: Sample[], difficulty: AiDifficulty) {
        const totalNodes = samples.reduce((sum, s) => sum + s.nodes, 0);
        const totalMs = samples.reduce((sum, s) => sum + s.ms, 0);
        const perSample = samples.map((s) => (s.ms > 0 ? (s.nodes / s.ms) * 1000 : 0));

        this.logger.info("");
        this.logger.info(`=== ${difficulty} search throughput ===`);
        this.logger.info(`positions          : ${samples.length}`);
        this.logger.info(`total nodes        : ${totalNodes}`);
        this.logger.info(`total time         : ${totalMs} ms`);
        this.logger.info(
            `THROUGHPUT         : ${totalMs > 0 ? Math.round((totalNodes / totalMs) * 1000) : 0} nodes/s (aggregate)`,
        );
        this.logger.info(`                     ${Math.round(median(perSample))} nodes/s (median)`);
        this.logger.info(
            `nodes per decision : median ${Math.round(median(samples.map((s) => s.nodes)))}`,
        );
        this.logger.info(
            `latency            : median ${Math.round(median(samples.map((s) => s.ms)))} ms`,
        );
        this.logger.info(
            `state size         : median ${(median(samples.map((s) => s.stateBytes)) / 1024).toFixed(1)} Ko, ` +
                `max ${(Math.max(...samples.map((s) => s.stateBytes)) / 1024).toFixed(1)} Ko`,
        );
        this.logger.info(
            `actionLog entries  : median ${median(samples.map((s) => s.actionLogEntries))}, ` +
                `max ${Math.max(...samples.map((s) => s.actionLogEntries))}`,
        );
        this.logger.info("");
        this.logger.info("cloned-state breakdown (largest position)");

        for (const [label, bytes] of this.breakdown(this.largestPosition)) {
            const share = (bytes / this.largestPosition.stateBytes) * 100;
            this.logger.info(
                `  ${label.padEnd(20)} ${(bytes / 1024).toFixed(1).padStart(7)} Ko  ${share.toFixed(1).padStart(5)} %`,
            );
        }

        this.logger.info("");
        this.logger.info("per-round detail (round: nodes in ms → nodes/s, state Ko, log entries)");

        for (const sample of samples) {
            this.logger.info(
                `  r${String(sample.round).padStart(2)}: ${String(sample.nodes).padStart(6)} in ${String(sample.ms).padStart(5)} ms ` +
                    `→ ${String(sample.ms > 0 ? Math.round((sample.nodes / sample.ms) * 1000) : 0).padStart(6)} nodes/s, ` +
                    `${(sample.stateBytes / 1024).toFixed(1).padStart(6)} Ko, ` +
                    `${String(sample.actionLogEntries).padStart(4)} log`,
            );
        }
    }
}
