import { BaseCommand, flags } from "@adonisjs/core/ace";
import type { GameData } from "#api_types/game.types";
import { getDefaultGameData } from "#controllers/games/create_game";
import { performPassTurn } from "#controllers/games/pass_game_turn";
import { finalizeMulligan } from "#controllers/games/mulligan/finalize_mulligan";
import { performMulliganOnPlayer } from "#controllers/games/mulligan/perform_mulligan";
import { ADVANCED_AI_DECKS } from "#database/seed_data/ai_decks";
import { MAX_SEARCH_DEPTH } from "#galaguerre/ai/advanced/advanced_ai_config";
import { selectMulliganCardUuids } from "#galaguerre/ai/advanced/advanced_mulligan";
import { decideNextMoves } from "#galaguerre/ai/advanced/decide_next_move";
import { getWeightsForProfile } from "#galaguerre/ai/advanced/evaluate_game_state";
import { EXPERT_AI_DEFAULTS } from "#galaguerre/ai/advanced/expert_ai_config";
import { prefilterMoves } from "#galaguerre/ai/advanced/prefilter_moves";
import { searchBestTurn } from "#galaguerre/ai/advanced/search_best_turn";
import { createDiscoverPicker } from "#galaguerre/ai/advanced/score_discover_option";
import { enumerateAiMoves, type AiMove } from "#galaguerre/ai/enumerate_ai_moves";
import { applyAiMove } from "#galaguerre/simulation/apply_ai_move";
import { createSimulationGame } from "#galaguerre/simulation/simulation_game";
import { stripStateForSearch } from "#galaguerre/simulation/strip_state_for_search";
import { loadTrainingBotCards } from "#services/training/load_training_bot_cards";
import { createSeededRng, runInSimulation } from "../app/utils/simulation_context.js";

/**
 * Diagnostic du PRÉ-FILTRE, à ne pas confondre avec `dev:bench-ai`.
 *
 *   node ace dev:bench-prefilter --games=6
 *
 * `prefilterMoves` ordonne les coups légaux avec une heuristique statique et ne garde que les
 * `topK` meilleurs. Un coup classé au-delà n'est pas mal noté : il n'est jamais simulé, à aucune
 * profondeur. Aucun pli supplémentaire, aucun budget, aucun classement final ne le rattrapera.
 *
 * Six hypothèses successives ont montré que mieux DÉPARTAGER les lignes que le faisceau produit ne
 * rapporte rien (voir `docs/ai-experiments.md`). Reste la question amont, jamais mesurée : le
 * faisceau produit-il les bonnes lignes ? C'est celle-ci.
 *
 * MÉTHODE. Sur chaque position, deux recherches :
 *
 * - la recherche de PRODUCTION (`topK` = 18, plafond de nœuds habituel) ;
 * - une recherche de RÉFÉRENCE sans pré-filtre (`topK` illimité) et au budget très large.
 *
 * Puis on compare le PREMIER coup rendu — le seul que l'appelant joue avant de re-décider.
 *
 * Un désaccord ne suffit pas à accuser le pré-filtre : la référence cherche aussi plus longtemps.
 * On départage les deux causes en cherchant le RANG du coup de la référence dans l'ordre complet
 * du pré-filtre. Rang < `topK` : le coup était disponible en production, le désaccord vient de la
 * profondeur. Rang >= `topK` : le pré-filtre l'avait bel et bien écarté, et c'est là, et là
 * seulement, qu'il y a quelque chose à gagner en le réglant.
 *
 * Le chiffre à lire est donc `imputables au pré-filtre`, rapporté aux positions TRONQUÉES et non à
 * l'ensemble : ailleurs, le pré-filtre rend le même ensemble de coups que la référence et les deux
 * recherches sont identiques par construction — leur accord ne prouve rien.
 *
 * CE QUE LA PREMIÈRE EXÉCUTION A DONNÉ, et qui vaut mieux qu'une réponse à la question posée :
 * médiane de 6 coups à ordonner pour un `topK` de 18, budget de 12 000 nœuds jamais atteint une
 * seule fois, médiane de 40 nœuds réellement simulés. Le faisceau ne tronque presque rien parce
 * qu'il n'a presque rien à tronquer — l'arbre d'un tour tient dans quelques dizaines de nœuds et
 * la recherche le termine. Voir `docs/ai-experiments.md`.
 */

const LEFT_USER_ID = -42;
const RIGHT_USER_ID = -43;
const MAX_ACTIONS_PER_TURN = 40;

/** Échéance hors d'atteinte : ce sont les plafonds de nœuds qui bornent, donc reproductible. */
const NO_DEADLINE = Number.POSITIVE_INFINITY;

/**
 * Budget de la recherche de référence. Volontairement disproportionné : on veut une BORNE
 * SUPÉRIEURE de ce que le pré-filtre coûte, pas un adversaire équitable. Si même cette
 * référence-là retombe sur le coup de production, il n'y a rien à récupérer.
 */
const REFERENCE_MAX_NODES = 250_000;

/** `topK` de la référence : assez haut pour ne jamais tronquer une position réelle. */
const REFERENCE_TOP_K = 999;

/** Coups joués pendant la collecte : borne de nœuds minuscule, on ne mesure rien ici. */
const COLLECTION_MAX_NODES = 120;

interface Position {
    round: number;
    data: GameData;
}

interface Comparison {
    round: number;
    /** Coups légaux hors `pass_turn`, c'est-à-dire ce que le pré-filtre a eu à ordonner. */
    candidateCount: number;
    agreed: boolean;
    /** Rang du coup de la référence dans l'ordre COMPLET du pré-filtre, `null` si introuvable. */
    referenceRank: number | null;
    /** Écart de score entre la ligne de référence et celle de production. */
    scoreGap: number;
    /** Nœuds réellement simulés par la recherche de production. */
    productionNodes: number;
    /**
     * `true` quand la recherche de production s'est arrêtée sur son budget et non parce qu'elle
     * avait fini d'explorer. C'est la question qui décide si un budget plus large peut servir à
     * quoi que ce soit : une recherche qui termine d'elle-même ne profitera d'aucun nœud de plus.
     */
    productionExhausted: boolean;
    /** Nœuds simulés par la référence, pour dire de combien elle a réellement creusé davantage. */
    referenceNodes: number;
}

/** Deux coups sont le même s'ils décrivent la même action : la comparaison porte sur la valeur. */
const sameMove = (left: AiMove | undefined, right: AiMove | undefined): boolean =>
    JSON.stringify(left ?? null) === JSON.stringify(right ?? null);

const percent = (count: number, total: number): string =>
    total === 0 ? "—" : `${((100 * count) / total).toFixed(1)} %`;

export default class BenchPrefilter extends BaseCommand {
    static commandName = "dev:bench-prefilter";
    static description = "Mesure ce que le pré-filtre de coups coûte au faisceau";
    static options = { startApp: true };

    @flags.number({
        description: "Nombre de parties dont les positions sont collectées",
        default: 4,
    })
    declare games: number;

    @flags.number({ description: "Tours joués par partie collectée", default: 12 })
    declare rounds: number;

    @flags.number({ description: "Graine de la première partie", default: 7 })
    declare seed: number;

    async run() {
        const positions: Position[] = [];

        for (let game = 0; game < this.games; game++) {
            positions.push(...(await this.collectPositions(this.seed + game)));
        }

        if (positions.length === 0) {
            this.logger.error("Aucune position collectée — les parties se sont finies trop tôt.");
            this.exitCode = 1;
            return;
        }

        this.logger.info(`${positions.length} positions collectées, comparaison en cours...`);

        const comparisons: Comparison[] = [];

        for (const position of positions) {
            const comparison = await this.compare(position);
            if (comparison) comparisons.push(comparison);
        }

        this.report(comparisons);
    }

    /**
     * Une position, deux recherches, un verdict.
     *
     * Les deux recherches partagent la GRAINE et l'état de départ : à `topK` et budget égaux elles
     * rendraient exactement la même ligne. Tout écart observé vient donc bien des deux seules
     * choses qu'on fait varier.
     */
    private async compare(position: Position): Promise<Comparison | null> {
        const data = stripStateForSearch(position.data);
        const game = createSimulationGame(data);
        const legalMoves = enumerateAiMoves(game, LEFT_USER_ID);

        // Fin de tour : rien à ordonner, rien à comparer.
        if (legalMoves.every((move) => move.type === "pass_turn")) return null;

        const weights = getWeightsForProfile("MIDRANGE");
        const pickDiscoverOption = createDiscoverPicker(LEFT_USER_ID, "MIDRANGE", {
            omniscient: true,
        });
        const seed = 1234;

        const search = (topK: number, maxNodes: number) =>
            runInSimulation({ rng: createSeededRng(seed) }, () =>
                searchBestTurn(data, {
                    aiUserId: LEFT_USER_ID,
                    weights,
                    beamWidth: EXPERT_AI_DEFAULTS.beamWidth,
                    topK,
                    maxNodes,
                    maxDepth: MAX_SEARCH_DEPTH,
                    deadline: NO_DEADLINE,
                    pickDiscoverOption,
                    seed,
                    omniscient: true,
                }),
            );

        const production = await search(EXPERT_AI_DEFAULTS.topK, EXPERT_AI_DEFAULTS.maxNodes);
        const reference = await search(REFERENCE_TOP_K, REFERENCE_MAX_NODES);

        const referenceFirst = reference.moves[0];
        const agreed = sameMove(production.moves[0], referenceFirst);

        // Ordre COMPLET du pré-filtre : c'est lui qui dit si le coup de la référence était
        // seulement hors des `topK`, ou s'il n'a jamais été proposé du tout.
        const fullOrder = prefilterMoves(legalMoves, data, LEFT_USER_ID, REFERENCE_TOP_K);
        const rank = referenceFirst
            ? fullOrder.findIndex((move) => sameMove(move, referenceFirst))
            : -1;

        return {
            round: position.round,
            candidateCount: fullOrder.length,
            agreed,
            referenceRank: rank < 0 ? null : rank,
            scoreGap: reference.score - production.score,
            productionNodes: production.nodesExplored,
            productionExhausted: production.budgetExhausted,
            referenceNodes: reference.nodesExplored,
        };
    }

    private report(comparisons: Comparison[]): void {
        const total = comparisons.length;
        const disagreements = comparisons.filter((entry) => !entry.agreed);

        // LE chiffre de cette commande. Un désaccord dont le coup était dans les `topK` est un
        // désaccord de PROFONDEUR : la référence a mieux cherché, pas mieux filtré.
        const truncated = disagreements.filter(
            (entry) =>
                entry.referenceRank === null || entry.referenceRank >= EXPERT_AI_DEFAULTS.topK,
        );

        const saturated = comparisons.filter(
            (entry) => entry.candidateCount > EXPERT_AI_DEFAULTS.topK,
        );

        const gaps = truncated.map((entry) => entry.scoreGap).sort((a, b) => a - b);
        const medianGap = gaps.length === 0 ? 0 : gaps[Math.floor(gaps.length / 2)]!;

        // Sans cette distribution, un « 0 % de désaccord » est illisible : il peut vouloir dire
        // « le pré-filtre choisit bien » comme « le pré-filtre n'a jamais eu à choisir ».
        const counts = comparisons.map((entry) => entry.candidateCount).sort((a, b) => a - b);
        const medianCount = counts[Math.floor(counts.length / 2)] ?? 0;
        const maxCount = counts.at(-1) ?? 0;

        this.logger.info("");
        this.logger.info(`Pré-filtre — topK de production : ${EXPERT_AI_DEFAULTS.topK}`);
        this.logger.info(`  positions comparées : ${total}`);
        this.logger.info(`  coups à ordonner : médiane ${medianCount}, maximum ${maxCount}`);
        this.logger.info(
            `  positions où le pré-filtre TRONQUE : ${saturated.length} ` +
                `(${percent(saturated.length, total)})`,
        );
        // Le dénominateur est le sous-ensemble SATURÉ, et pas l'ensemble des positions. Sur une
        // position où les coups légaux tiennent dans `topK`, le pré-filtre rend exactement le même
        // ensemble que la référence : les deux recherches sont alors identiques par construction et
        // leur accord ne prouve rien. Les compter dilue le seul chiffre qui porte de l'information.
        const disagreementRatio = `${disagreements.length} / ${saturated.length}`;

        this.logger.info(`  désaccords parmi les positions tronquées : ${disagreementRatio}`);
        this.logger.info(
            `  dont imputables au pré-filtre : ${truncated.length} ` +
                `(${percent(truncated.length, saturated.length)} des positions tronquées)`,
        );
        this.logger.info(`  écart de score médian sur ces cas : ${medianGap.toFixed(2)}`);

        // La deuxième question, née de la première : si la production ne consomme jamais son
        // budget, elle a fini d'explorer — et alors AUCUNE amélioration de la recherche, pré-filtre
        // compris, ne peut rien lui apporter.
        const exhausted = comparisons.filter((entry) => entry.productionExhausted);
        const productionNodes = comparisons
            .map((entry) => entry.productionNodes)
            .sort((a, b) => a - b);
        const referenceNodes = comparisons
            .map((entry) => entry.referenceNodes)
            .sort((a, b) => a - b);

        this.logger.info("");
        this.logger.info(`Budget — plafond de production : ${EXPERT_AI_DEFAULTS.maxNodes} nœuds`);
        this.logger.info(
            `  recherches arrêtées par le budget : ${exhausted.length} ` +
                `(${percent(exhausted.length, total)})`,
        );
        this.logger.info(
            `  nœuds simulés, production : médiane ${productionNodes[Math.floor(total / 2)] ?? 0}` +
                `, maximum ${productionNodes.at(-1) ?? 0}`,
        );
        this.logger.info(
            `  nœuds simulés, référence : médiane ${referenceNodes[Math.floor(total / 2)] ?? 0}` +
                `, maximum ${referenceNodes.at(-1) ?? 0}`,
        );

        if (saturated.length === 0) {
            this.logger.info("");
            this.logger.info(
                "Le pré-filtre n'a jamais tronqué : topK dépasse le nombre de coups légaux sur " +
                    "toutes les positions vues. Le régler ne peut rien changer ici — collecter " +
                    "des positions plus riches (--rounds plus élevé) avant de conclure.",
            );
        }
    }

    /** Déroule une partie seedée et retient l'état au début de chaque tour du camp gauche. */
    private async collectPositions(seed: number): Promise<Position[]> {
        const deck = ADVANCED_AI_DECKS[0]!;

        const leftPlayer = {
            userId: LEFT_USER_ID,
            pseudo: "left",
            avatarCardId: 1,
            cards: await loadTrainingBotCards(deck.recipe),
        };
        const rightPlayer = {
            userId: RIGHT_USER_ID,
            pseudo: "right",
            avatarCardId: 1,
            cards: await loadTrainingBotCards(deck.recipe),
        };

        return runInSimulation({ rng: createSeededRng(seed) }, async () => {
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
                    positions.push({
                        round: game.data.currentRound,
                        data: JSON.parse(JSON.stringify(game.data)) as GameData,
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
     * Tour joué avec un budget minuscule, borné en NŒUDS et non en temps : le déroulé de la partie
     * collectée doit être identique d'une exécution à l'autre, sans quoi deux mesures porteraient
     * sur des positions différentes.
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
                    ...EXPERT_AI_DEFAULTS,
                    maxNodes: COLLECTION_MAX_NODES,
                    maxThinkMs: 1,
                    minThinkMs: 0,
                },
                seed: this.seed * 100 + action,
                deterministic: true,
            });

            if (decision.moves.length === 0) break;

            const applied = await applyAiMove(game.data, aiUserId, decision.moves[0]!);
            if (!applied.applied) break;

            game.data = applied.data;

            if (applied.finished) {
                game.isFinished = true;
                break;
            }
        }
    }
}
