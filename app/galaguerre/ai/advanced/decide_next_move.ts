import type { AiDeckProfile, GameData } from "#api_types/game.types";
import { createSeededRng, runInSimulation } from "../../../utils/simulation_context.js";
import { enumerateAiMoves, type AiMove } from "../enumerate_ai_moves.js";
import { createSimulationGame } from "../../simulation/simulation_game.js";
import {
    computeThinkBudgetMs,
    MAX_SEARCH_DEPTH,
    type AdvancedAiConfig,
} from "./advanced_ai_config.js";
import { getWeightsForProfile } from "./evaluate_game_state.js";
import type { ExpertDecisionTrace } from "./expert_decision_trace.js";
import { findLethalSequence } from "./find_lethal.js";
import { createDiscoverPicker } from "./score_discover_option.js";
import { fallbackWhenSearchNeverRan, searchBestTurn } from "./search_best_turn.js";
import { stripStateForSearch } from "../../simulation/strip_state_for_search.js";

/**
 * Décide de la suite du tour de l'IA avancée à partir de l'état courant.
 *
 * On rend une SÉQUENCE de coups, mais l'appelant n'en joue en principe que le premier avant de
 * rappeler cette fonction : l'aléatoire du jeu (découvertes, invocations, cibles aléatoires) fait
 * diverger l'état réel de l'état simulé, et re-décider à chaque action est plus robuste que de
 * dérouler un plan périmé. La séquence complète sert de repli quand un coup échoue.
 */

export interface DecideNextMoveOptions {
    aiUserId: number;
    profile: AiDeckProfile | undefined;
    config: AdvancedAiConfig;
    /** Graine du PRNG de simulation ; à faire varier entre deux décisions. */
    seed: number;
    /**
     * Mode du banc d'essai : recherche bornée par les seuls plafonds de nœuds, sans échéance
     * horloge, pour que deux exécutions d'une même graine jouent la même partie. Voir la même
     * option sur `decideExpertMoves`. À ne jamais activer en production.
     */
    deterministic?: boolean;
}

export interface AiDecision {
    moves: AiMove[];
    /** `true` quand la séquence tue l'adversaire ce tour-ci. */
    isLethal: boolean;
    nodesExplored: number;
    elapsedMs: number;
    /**
     * Diagnostic du pli de riposte, renseigné par l'IA Expert uniquement. Sert au banc d'essai à
     * mesurer la fréquence à laquelle l'Expert retombe sur le choix de l'Avancé.
     */
    expertTrace?: ExpertDecisionTrace;
}

/** Échéance hors d'atteinte : en mode déterministe, seuls les plafonds de nœuds bornent. */
const NO_DEADLINE = Number.POSITIVE_INFINITY;

export const decideNextMoves = async (
    rawData: GameData,
    { aiUserId, profile, config, seed, deterministic = false }: DecideNextMoveOptions,
): Promise<AiDecision> => {
    const startedAt = Date.now();

    // Allégé une fois ici : chaque nœud exploré en dessous recopiera l'état, jamais l'original.
    const data = stripStateForSearch(rawData);

    const game = createSimulationGame(data);
    const legalMoves = enumerateAiMoves(game, aiUserId);
    const ai = data.playerOne.userId === aiUserId ? data.playerOne : data.playerTwo;

    const budgetMs = computeThinkBudgetMs(config, {
        legalMoveCount: legalMoves.length,
        mana: ai.mana,
    });
    const deadline = deterministic ? NO_DEADLINE : startedAt + budgetMs;

    const pickDiscoverOption = createDiscoverPicker(aiUserId, profile);
    const weights = getWeightsForProfile(profile);

    return runInSimulation({ rng: createSeededRng(seed) }, async () => {
        // Le létal d'abord : c'est l'erreur la plus chère à commettre, on ne la délègue pas à
        // l'élagage du faisceau. Il consomme au plus la moitié du budget.
        const lethal = await findLethalSequence(data, {
            aiUserId,
            maxNodes: Math.floor(config.maxNodes / 2),
            deadline: deterministic ? NO_DEADLINE : startedAt + Math.floor(budgetMs / 2),
            pickDiscoverOption,
        });

        if (lethal.moves && lethal.moves.length > 0) {
            return {
                moves: lethal.moves,
                isLethal: true,
                nodesExplored: 0,
                elapsedMs: Date.now() - startedAt,
            };
        }

        const result = await searchBestTurn(data, {
            aiUserId,
            weights,
            beamWidth: config.beamWidth,
            topK: config.topK,
            maxNodes: config.maxNodes,
            maxDepth: MAX_SEARCH_DEPTH,
            deadline,
            pickDiscoverOption,
            seed,
        });

        return {
            moves: fallbackWhenSearchNeverRan(result, legalMoves, data, aiUserId),
            isLethal: false,
            nodesExplored: result.nodesExplored,
            elapsedMs: Date.now() - startedAt,
        };
    });
};
