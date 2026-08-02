import { BaseCommand, flags } from "@adonisjs/core/ace";
import {
    AI_DIFFICULTIES,
    type AiDeckProfile,
    type AiDifficulty,
    type GameData,
} from "#api_types/game.types";
import { getDefaultGameData } from "#controllers/games/create_game";
import { performPassTurn } from "#controllers/games/pass_game_turn";
import { finalizeMulligan } from "#controllers/games/mulligan/finalize_mulligan";
import { ADVANCED_AI_DECKS } from "#database/seed_data/ai_decks";
import { TRAINING_BOT_DECK_RECIPE } from "#database/seed_data/training_bot_deck";
import type { DeckRecipeEntry } from "#database/seed_data/balanced_decks";
import {
    ADVANCED_AI_DEFAULTS,
    type AdvancedAiConfig,
} from "#galaguerre/ai/advanced/advanced_ai_config";
import { EXPERT_AI_DEFAULTS, type ExpertAiConfig } from "#galaguerre/ai/advanced/expert_ai_config";
import { selectMulliganCardUuids } from "#galaguerre/ai/advanced/advanced_mulligan";
import { decideNextMoves } from "#galaguerre/ai/advanced/decide_next_move";
import { decideExpertMoves } from "#galaguerre/ai/advanced/decide_expert_move";
import type { AiDecision } from "#galaguerre/ai/advanced/decide_next_move";
import { enumerateAiMoves } from "#galaguerre/ai/enumerate_ai_moves";
import { applyAiMove } from "#galaguerre/simulation/apply_ai_move";
import { createSimulationGame } from "#galaguerre/simulation/simulation_game";
import { performMulliganOnPlayer } from "#controllers/games/mulligan/perform_mulligan";
import { loadTrainingBotCards } from "#services/training/load_training_bot_cards";
import { createSeededRng, runInSimulation } from "../app/utils/simulation_context.js";

/**
 * Banc d'essai : fait s'affronter deux niveaux d'IA entièrement en simulation (aucune écriture en
 * base) et rapporte le taux de victoire.
 *
 * C'est la mesure qui dit si une IA est réellement plus forte qu'une autre — les tests unitaires
 * ne valident que des comportements isolés. Exemples :
 *
 *   node ace dev:bench-ai --left=EXPERT --right=ADVANCED --mirror --games=100
 *   node ace dev:bench-ai --left=ADVANCED --right=BEGINNER --games=100
 *
 * `--mirror` donne le MÊME deck aux deux camps : c'est ce qui isole la force de l'IA de celle de
 * son deck. Sans lui, un écart de winrate peut n'être qu'un écart de liste.
 */

const LEFT_USER_ID = -42;
const RIGHT_USER_ID = -43;
const MAX_ROUNDS = 60;
const MAX_ACTIONS_PER_TURN = 40;

type Side = "LEFT" | "RIGHT";

interface TurnStats {
    /** Durée de chaque décision, en ms : sert au calcul des percentiles de latence. */
    decisionMs: number[];
}

interface GameOutcome {
    winner: Side | null;
    rounds: number;
    leftDecisionMs: number[];
    rightDecisionMs: number[];
}

/** Un camp du banc d'essai : sa difficulté, son deck et la façon dont il choisit ses coups. */
interface Contender {
    difficulty: AiDifficulty;
    userId: number;
    profile: AiDeckProfile;
    recipe: DeckRecipeEntry[];
}

const percentile = (values: number[], ratio: number): number => {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(sorted.length - 1, Math.floor(ratio * sorted.length));

    return sorted[index]!;
};

const isAiDifficulty = (value: string): value is AiDifficulty =>
    (AI_DIFFICULTIES as readonly string[]).includes(value);

export default class BenchAi extends BaseCommand {
    static commandName = "dev:bench-ai";
    static description = "Play two AI difficulties against each other and report the win rate";
    static options = { startApp: true };

    @flags.number({ description: "Number of games to play", default: 20 })
    declare games: number;

    @flags.number({ description: "Max thinking time per action, in ms", default: 0 })
    declare thinkMs: number;

    @flags.string({ description: "Force the AI deck profile: AGGRO or MIDRANGE" })
    declare profile?: string;

    @flags.string({
        description: `Difficulty of the left side (${AI_DIFFICULTIES.join(" | ")})`,
        default: "ADVANCED",
    })
    declare left: string;

    @flags.string({
        description: `Difficulty of the right side (${AI_DIFFICULTIES.join(" | ")})`,
        default: "BEGINNER",
    })
    declare right: string;

    @flags.boolean({
        description: "Give both sides the same deck, to isolate AI strength from decks",
        default: false,
    })
    declare mirror: boolean;

    async run() {
        const left = this.left.toUpperCase();
        const right = this.right.toUpperCase();

        if (!isAiDifficulty(left) || !isAiDifficulty(right)) {
            this.logger.error(`--left/--right must be one of ${AI_DIFFICULTIES.join(", ")}`);
            this.exitCode = 1;
            return;
        }

        const decks = this.profile
            ? ADVANCED_AI_DECKS.filter(({ profile }) => profile === this.profile)
            : ADVANCED_AI_DECKS;

        if (decks.length === 0) {
            this.logger.error(`Unknown profile "${this.profile}" (expected AGGRO or MIDRANGE)`);
            this.exitCode = 1;
            return;
        }

        const advancedConfig: AdvancedAiConfig = {
            ...ADVANCED_AI_DEFAULTS,
            maxThinkMs: this.thinkMs > 0 ? this.thinkMs : ADVANCED_AI_DEFAULTS.maxThinkMs,
        };
        const expertConfig: ExpertAiConfig = {
            ...EXPERT_AI_DEFAULTS,
            maxThinkMs: this.thinkMs > 0 ? this.thinkMs : EXPERT_AI_DEFAULTS.maxThinkMs,
        };

        const outcomes: GameOutcome[] = [];

        for (let index = 0; index < this.games; index++) {
            const deck = decks[index % decks.length]!;

            const leftContender = this.buildContender(left, LEFT_USER_ID, deck);
            // En miroir, le camp droit reprend exactement le deck du camp gauche.
            const rightContender = this.buildContender(
                right,
                RIGHT_USER_ID,
                this.mirror
                    ? { profile: leftContender.profile, recipe: leftContender.recipe }
                    : deck,
            );

            const outcome = await this.playGame({
                left: leftContender,
                right: rightContender,
                // On alterne qui commence : le premier joueur a un avantage structurel.
                leftGoesFirst: index % 2 === 0,
                advancedConfig,
                expertConfig,
                seed: index + 1,
            });

            outcomes.push(outcome);
            this.logger.info(
                `game ${index + 1}/${this.games} → ${outcome.winner ?? "DRAW"} in ${outcome.rounds} rounds`,
            );
        }

        this.report(outcomes, left, right);
    }

    /** Le Débutant garde son deck historique ; les IA à recherche prennent un deck d'IA. */
    private buildContender(
        difficulty: AiDifficulty,
        userId: number,
        deck: { profile: AiDeckProfile; recipe: DeckRecipeEntry[] },
    ): Contender {
        if (difficulty === "BEGINNER") {
            return {
                difficulty,
                userId,
                profile: "MIDRANGE",
                recipe: TRAINING_BOT_DECK_RECIPE,
            };
        }

        return { difficulty, userId, profile: deck.profile, recipe: deck.recipe };
    }

    private report(outcomes: GameOutcome[], left: AiDifficulty, right: AiDifficulty) {
        const wins = outcomes.filter(({ winner }) => winner === "LEFT").length;
        const losses = outcomes.filter(({ winner }) => winner === "RIGHT").length;
        const draws = outcomes.length - wins - losses;

        const leftMs = outcomes.flatMap(({ leftDecisionMs }) => leftDecisionMs);
        const rightMs = outcomes.flatMap(({ rightDecisionMs }) => rightDecisionMs);
        const avgRounds = outcomes.reduce((sum, o) => sum + o.rounds, 0) / outcomes.length;

        this.logger.info("");
        this.logger.info(`${left} (left)  wins : ${wins}/${outcomes.length}`);
        this.logger.info(`${right} (right) wins : ${losses}/${outcomes.length}`);
        this.logger.info(`draws / timeouts     : ${draws}`);
        this.logger.info(
            `${left} win rate       : ${((wins / outcomes.length) * 100).toFixed(1)}%`,
        );
        this.logger.info(`avg rounds           : ${avgRounds.toFixed(1)}`);
        this.logger.info(this.formatLatency(`${left} (left)`, leftMs));
        this.logger.info(this.formatLatency(`${right} (right)`, rightMs));
    }

    private formatLatency(label: string, samples: number[]): string {
        if (samples.length === 0) return `${label} latency: n/a`;

        const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;

        return (
            `${label} latency: mean ${mean.toFixed(0)} ms, ` +
            `p50 ${percentile(samples, 0.5).toFixed(0)} ms, ` +
            `p95 ${percentile(samples, 0.95).toFixed(0)} ms ` +
            `(${samples.length} decisions)`
        );
    }

    private async playGame({
        left,
        right,
        leftGoesFirst,
        advancedConfig,
        expertConfig,
        seed,
    }: {
        left: Contender;
        right: Contender;
        leftGoesFirst: boolean;
        advancedConfig: AdvancedAiConfig;
        expertConfig: ExpertAiConfig;
        seed: number;
    }): Promise<GameOutcome> {
        const leftPlayer = {
            userId: left.userId,
            pseudo: `${left.difficulty} (left)`,
            avatarCardId: 1,
            cards: await loadTrainingBotCards(left.recipe),
        };
        const rightPlayer = {
            userId: right.userId,
            pseudo: `${right.difficulty} (right)`,
            avatarCardId: 1,
            cards: await loadTrainingBotCards(right.recipe),
        };

        const leftDecisionMs: number[] = [];
        const rightDecisionMs: number[] = [];

        return runInSimulation({ rng: createSeededRng(seed) }, async () => {
            const data: GameData = getDefaultGameData({
                playerOne: leftGoesFirst ? leftPlayer : rightPlayer,
                playerTwo: leftGoesFirst ? rightPlayer : leftPlayer,
                isTraining: true,
            });

            const game = createSimulationGame(data);

            for (const contender of [left, right]) {
                if (contender.difficulty === "BEGINNER") continue;

                const isPlayerOne = (contender === left) === leftGoesFirst;
                const player = isPlayerOne ? game.data.playerOne : game.data.playerTwo;
                const opponent = isPlayerOne ? game.data.playerTwo : game.data.playerOne;

                performMulliganOnPlayer(
                    player,
                    selectMulliganCardUuids(player, contender.profile, {
                        opponent: contender.difficulty === "EXPERT" ? opponent : undefined,
                    }),
                );
            }

            await finalizeMulligan(game);

            while (!game.isFinished && game.data.currentRound <= MAX_ROUNDS) {
                if (
                    game.data.state !== "PLAYER_ONE_TURN" &&
                    game.data.state !== "PLAYER_TWO_TURN"
                ) {
                    break;
                }

                const activeIsPlayerOne = game.data.state === "PLAYER_ONE_TURN";
                const isLeftTurn = activeIsPlayerOne === leftGoesFirst;
                const active = isLeftTurn ? left : right;
                const passive = isLeftTurn ? right : left;

                const stats = await this.playTurn(game, active, passive, {
                    advancedConfig,
                    expertConfig,
                    seed,
                });

                (isLeftTurn ? leftDecisionMs : rightDecisionMs).push(...stats.decisionMs);

                if (game.isFinished) break;

                const activePlayer = activeIsPlayerOne ? game.data.playerOne : game.data.playerTwo;
                await performPassTurn(game, activePlayer);
            }

            return {
                winner: this.resolveWinner(game.data, left.userId),
                rounds: game.data.currentRound,
                leftDecisionMs,
                rightDecisionMs,
            };
        });
    }

    private resolveWinner(data: GameData, leftUserId: number): Side | null {
        const left = data.playerOne.userId === leftUserId ? data.playerOne : data.playerTwo;
        const right = data.playerOne.userId === leftUserId ? data.playerTwo : data.playerOne;

        if (right.health <= 0 && left.health > 0) return "LEFT";
        if (left.health <= 0 && right.health > 0) return "RIGHT";
        return null;
    }

    private async playTurn(
        game: ReturnType<typeof createSimulationGame>,
        active: Contender,
        passive: Contender,
        configs: { advancedConfig: AdvancedAiConfig; expertConfig: ExpertAiConfig; seed: number },
    ): Promise<TurnStats> {
        if (active.difficulty === "BEGINNER") {
            await this.playBeginnerTurn(game, active.userId);
            return { decisionMs: [] };
        }

        const decisionMs: number[] = [];

        for (let action = 0; action < MAX_ACTIONS_PER_TURN; action++) {
            if (game.isFinished || game.data.pendingDiscover) break;

            const seed = configs.seed * 1000 + game.data.currentRound * 100 + action;
            const decision = await this.decide(game.data, active, passive, configs, seed);

            decisionMs.push(decision.elapsedMs);

            if (decision.moves.length === 0) break;

            const result = await applyAiMove(game.data, active.userId, decision.moves[0]!);
            if (!result.applied) break;

            game.data = result.data;
            if (result.finished) {
                game.isFinished = true;
                break;
            }
        }

        return { decisionMs };
    }

    private decide(
        data: GameData,
        active: Contender,
        passive: Contender,
        configs: { advancedConfig: AdvancedAiConfig; expertConfig: ExpertAiConfig },
        seed: number,
    ): Promise<AiDecision> {
        if (active.difficulty === "EXPERT") {
            return decideExpertMoves(data, {
                aiUserId: active.userId,
                opponentUserId: passive.userId,
                profile: active.profile,
                config: configs.expertConfig,
                seed,
            });
        }

        return decideNextMoves(data, {
            aiUserId: active.userId,
            profile: active.profile,
            config: configs.advancedConfig,
            seed,
        });
    }

    private async playBeginnerTurn(
        game: ReturnType<typeof createSimulationGame>,
        aiUserId: number,
    ): Promise<void> {
        // Reproduit la politique de `runAiTurn` : le premier coup légal qui change l'état.
        for (let action = 0; action < MAX_ACTIONS_PER_TURN; action++) {
            if (game.isFinished || game.data.pendingDiscover) break;

            const moves = enumerateAiMoves(game, aiUserId).filter(
                (move) => move.type !== "pass_turn",
            );
            if (moves.length === 0) break;

            let applied = false;
            for (const move of moves) {
                const result = await applyAiMove(game.data, aiUserId, move);
                if (!result.applied) continue;

                game.data = result.data;
                applied = true;

                if (result.finished) {
                    game.isFinished = true;
                }
                break;
            }

            if (!applied || game.isFinished) break;
        }
    }
}
