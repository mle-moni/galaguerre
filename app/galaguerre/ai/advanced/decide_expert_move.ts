import type { AiDeckProfile, GameData } from "#api_types/game.types";
import { createSeededRng, runInSimulation } from "../../../utils/simulation_context.js";
import { createSimulationGame } from "../../simulation/simulation_game.js";
import { enumerateAiMoves } from "../enumerate_ai_moves.js";
import { computeThinkBudgetMs, MAX_SEARCH_DEPTH } from "./advanced_ai_config.js";
import type { AiDecision } from "./decide_next_move.js";
import { getWeightsForProfile } from "./evaluate_game_state.js";
import { EXPERT_BUDGET_SHARES, type ExpertAiConfig } from "./expert_ai_config.js";
import { findLethalSequence } from "./find_lethal.js";
import { createDiscoverPicker } from "./score_discover_option.js";
import { searchBestTurn } from "./search_best_turn.js";
import { scoreAfterOpponentReply } from "./search_opponent_reply.js";

/**
 * Décision de l'IA « Expert ».
 *
 * Même ossature que `decideNextMoves` (létal d'abord, puis recherche en faisceau), avec un pli
 * supplémentaire qui change tout : au lieu de garder la ligne au meilleur score STATIQUE de fin
 * de tour, l'Expert conserve les meilleures lignes puis les départage en SIMULANT le tour que
 * l'adversaire jouerait après chacune (`scoreAfterOpponentReply`). Il choisit la ligne dont la
 * riposte fait le moins mal — c'est-à-dire qu'il joue autour de la main adverse, qu'il connaît.
 *
 * Si le budget de temps est épuisé avant la re-notation, la ligne du faisceau est rendue telle
 * quelle : l'Expert dégrade proprement vers le comportement de l'IA Avancée.
 */

export interface DecideExpertMoveOptions {
    aiUserId: number;
    opponentUserId: number;
    profile: AiDeckProfile | undefined;
    config: ExpertAiConfig;
    /** Graine du PRNG de simulation ; à faire varier entre deux décisions. */
    seed: number;
}

export const decideExpertMoves = async (
    data: GameData,
    { aiUserId, opponentUserId, profile, config, seed }: DecideExpertMoveOptions,
): Promise<AiDecision> => {
    const startedAt = Date.now();

    const game = createSimulationGame(data);
    const legalMoves = enumerateAiMoves(game, aiUserId);
    const ai = data.playerOne.userId === aiUserId ? data.playerOne : data.playerTwo;

    const budgetMs = computeThinkBudgetMs(config, {
        legalMoveCount: legalMoves.length,
        mana: ai.mana,
    });

    const lethalDeadline = startedAt + budgetMs * EXPERT_BUDGET_SHARES.lethal;
    const beamDeadline = lethalDeadline + budgetMs * EXPERT_BUDGET_SHARES.beam;
    const replyDeadline = startedAt + budgetMs;

    const pickDiscoverOption = createDiscoverPicker(aiUserId, profile, { omniscient: true });
    const weights = getWeightsForProfile(profile);

    return runInSimulation({ rng: createSeededRng(seed) }, async () => {
        // Un létal gagne la partie : aucune réplique adverse à évaluer.
        const lethal = await findLethalSequence(data, {
            aiUserId,
            maxNodes: Math.floor(config.maxNodes / 2),
            deadline: lethalDeadline,
            pickDiscoverOption,
        });

        if (lethal && lethal.length > 0) {
            return {
                moves: lethal,
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
            deadline: beamDeadline,
            pickDiscoverOption,
            topResults: config.replyCandidates,
            omniscient: true,
        });

        const candidates = result.candidates.slice(0, config.replyCandidates);

        // Une seule ligne à considérer : la réplique ne peut rien départager.
        if (candidates.length <= 1) {
            return {
                moves: result.moves,
                isLethal: false,
                nodesExplored: result.nodesExplored,
                elapsedMs: Date.now() - startedAt,
            };
        }

        // Budget de réplique partagé équitablement entre les lignes restantes.
        const perCandidateMs = Math.max(
            1,
            Math.floor((replyDeadline - Date.now()) / candidates.length),
        );

        let bestMoves = result.moves;
        let bestScore = -Infinity;

        for (const candidate of candidates) {
            // Une ligne qui gagne la partie ce tour-ci n'a pas de suite à simuler.
            if (candidate.finished) {
                if (candidate.endScore > bestScore) {
                    bestScore = candidate.endScore;
                    bestMoves = candidate.moves;
                }
                continue;
            }

            if (Date.now() >= replyDeadline) break;

            const score = await scoreAfterOpponentReply(candidate.data, {
                aiUserId,
                opponentUserId,
                weights,
                beamWidth: config.replyBeamWidth,
                topK: config.replyTopK,
                maxNodes: config.replyMaxNodes,
                deadline: Math.min(replyDeadline, Date.now() + perCandidateMs),
                pickDiscoverOption,
            });

            if (score > bestScore) {
                bestScore = score;
                bestMoves = candidate.moves;
            }
        }

        return {
            moves: bestMoves,
            isLethal: false,
            nodesExplored: result.nodesExplored,
            elapsedMs: Date.now() - startedAt,
        };
    });
};
