import type { AiDeckProfile, GameData } from "#api_types/game.types";
import { createSeededRng, runInSimulation } from "../../../utils/simulation_context.js";
import { createSimulationGame } from "../../simulation/simulation_game.js";
import { enumerateAiMoves, type AiMove } from "../enumerate_ai_moves.js";
import { computeThinkBudgetMs, MAX_SEARCH_DEPTH } from "./advanced_ai_config.js";
import type { AiDecision } from "./decide_next_move.js";
import { getWeightsForProfile } from "./evaluate_game_state.js";
import {
    EXPERT_BUDGET_SHARES,
    EXPERT_REPLY_LETHAL_TIME_SHARE,
    type ExpertAiConfig,
} from "./expert_ai_config.js";
import { createExpertDecisionTrace } from "./expert_decision_trace.js";
import { findLethalSequence } from "./find_lethal.js";
import { createDiscoverPicker } from "./score_discover_option.js";
import { deriveSeed, fallbackWhenSearchNeverRan, searchBestTurn } from "./search_best_turn.js";
import { scoreAfterOpponentReply } from "./search_opponent_reply.js";
import { stripStateForSearch } from "../../simulation/strip_state_for_search.js";

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

/**
 * En dessous de ce budget, simuler un tour adverse ne rend rien d'exploitable : on préfère ne pas
 * évaluer la ligne du tout plutôt que de la noter sur une riposte imaginaire.
 */
const MIN_REPLY_SLICE_MS = 25;

/**
 * Échéance hors d'atteinte, utilisée en mode déterministe : c'est alors le plafond de NŒUDS qui
 * borne seul la recherche. Voir `deterministic` ci-dessous.
 */
const NO_DEADLINE = Number.POSITIVE_INFINITY;

export interface DecideExpertMoveOptions {
    aiUserId: number;
    opponentUserId: number;
    profile: AiDeckProfile | undefined;
    config: ExpertAiConfig;
    /** Graine du PRNG de simulation ; à faire varier entre deux décisions. */
    seed: number;
    /**
     * Mode du banc d'essai : la recherche n'est plus bornée par l'horloge, uniquement par ses
     * plafonds de nœuds. Deux exécutions d'une même graine jouent alors EXACTEMENT la même partie,
     * quelle que soit la charge de la machine.
     *
     * C'est la condition pour qu'un écart de winrate mesure une différence de politique et non un
     * écart de vitesse d'exécution : à budget-temps, une variante plus lente perd des nœuds et
     * paraît plus faible même quand son idée est meilleure. Le banc mesure les deux séparément.
     *
     * À ne jamais activer en production : sans échéance, une position complexe n'a plus de borne
     * de latence.
     */
    deterministic?: boolean;
}

export const decideExpertMoves = async (
    rawData: GameData,
    {
        aiUserId,
        opponentUserId,
        profile,
        config,
        seed,
        deterministic = false,
    }: DecideExpertMoveOptions,
): Promise<AiDecision> => {
    const startedAt = Date.now();
    const trace = createExpertDecisionTrace();

    // Allégé une fois ici : le faisceau, la recherche de létal et chaque riposte partent de cet
    // état et le recopieront à chaque nœud.
    const data = stripStateForSearch(rawData);

    const game = createSimulationGame(data);
    const legalMoves = enumerateAiMoves(game, aiUserId);
    const ai = data.playerOne.userId === aiUserId ? data.playerOne : data.playerTwo;

    const budgetMs = computeThinkBudgetMs(config, {
        legalMoveCount: legalMoves.length,
        mana: ai.mana,
    });

    const lethalDeadline = deterministic
        ? NO_DEADLINE
        : startedAt + budgetMs * EXPERT_BUDGET_SHARES.lethal;
    const beamDeadline = deterministic
        ? NO_DEADLINE
        : lethalDeadline + budgetMs * EXPERT_BUDGET_SHARES.beam;
    const replyDeadline = deterministic ? NO_DEADLINE : startedAt + budgetMs;

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
            deadline: beamDeadline,
            pickDiscoverOption,
            seed,
            topResults: config.replyCandidates,
            omniscient: true,
        });

        const candidates = result.candidates.slice(0, config.replyCandidates);
        trace.candidates = candidates.length;

        // Ligne du faisceau seul, sans le pli de riposte : c'est le choix de l'IA Avancée, et le
        // repli de l'Expert chaque fois que la re-notation ne peut pas trancher.
        const beamMoves = fallbackWhenSearchNeverRan(result, legalMoves, data, aiUserId);

        // Une seule ligne à considérer : la réplique ne peut rien départager.
        if (candidates.length <= 1) {
            trace.fallback = "SINGLE_CANDIDATE";

            return {
                moves: beamMoves,
                isLethal: false,
                nodesExplored: result.nodesExplored,
                elapsedMs: Date.now() - startedAt,
                expertTrace: trace,
            };
        }

        let bestMoves: AiMove[] | null = null;
        let bestScore = -Infinity;

        for (const [index, candidate] of candidates.entries()) {
            // Une ligne qui gagne la partie ce tour-ci n'a pas de suite à simuler.
            if (candidate.finished) {
                if (candidate.endScore > bestScore) {
                    bestScore = candidate.endScore;
                    bestMoves = candidate.moves;
                }
                continue;
            }

            // Tranche recalculée à chaque tour sur les candidats RESTANTS : figée d'avance, un
            // candidat qui déborde affamerait tous les suivants. En mode déterministe il n'y a pas
            // d'horloge : chaque candidat reçoit son plein plafond de nœuds.
            const remainingMs = replyDeadline - Date.now();
            const perCandidateMs = Math.floor(remainingMs / (candidates.length - index));

            // Sous le plancher, la riposte n'aurait pas le temps de simuler quoi que ce soit :
            // mieux vaut un candidat écarté qu'un candidat noté sur un adversaire supposé passif.
            if (!deterministic && perCandidateMs < MIN_REPLY_SLICE_MS) {
                trace.repliesSkipped += candidates.length - index;
                break;
            }

            const candidateDeadline = deterministic
                ? NO_DEADLINE
                : Math.min(replyDeadline, Date.now() + perCandidateMs);

            const reply = await scoreAfterOpponentReply(candidate.data, {
                aiUserId,
                opponentUserId,
                weights,
                beamWidth: config.replyBeamWidth,
                topK: config.replyTopK,
                maxNodes: config.replyMaxNodes,
                deadline: candidateDeadline,
                lethalMaxNodes: config.replyLethalMaxNodes,
                // Le létal adverse ne prend qu'une part de la tranche : le reste doit rester au
                // faisceau de riposte, sans quoi la riposte revient incomplète et le candidat est
                // écarté — on aurait payé la recherche pour ne rien pouvoir en faire.
                lethalDeadline: deterministic
                    ? NO_DEADLINE
                    : Date.now() + perCandidateMs * EXPERT_REPLY_LETHAL_TIME_SHARE,
                pickDiscoverOption,
                // Graine dérivée de la ligne candidate : sa riposte est donc simulée sur le même
                // aléatoire quel que soit son rang dans le classement.
                seed: deriveSeed(seed, candidate.moves),
            });

            if (reply.opponentHasLethal) trace.sawOpponentLethal = true;

            // Une riposte tronquée rend le score d'un adversaire passif, très au-dessus de toute
            // ligne réellement évaluée : la comparer reviendrait à préférer systématiquement la
            // ligne qu'on a le moins regardée.
            if (!reply.complete) {
                trace.repliesIncomplete++;
                continue;
            }

            trace.repliesScored++;

            if (reply.score > bestScore) {
                bestScore = reply.score;
                bestMoves = candidate.moves;
            }
        }

        if (bestMoves === null) trace.fallback = "NO_COMPLETE_REPLY";

        return {
            // Aucun candidat départagé : on rend la meilleure ligne du faisceau, c'est-à-dire le
            // choix qu'aurait fait l'IA Avancée. C'est la dégradation propre annoncée en tête de
            // fichier, et elle vaut mieux qu'un classement tiré au sort par le chronomètre.
            moves: bestMoves ?? beamMoves,
            isLethal: false,
            nodesExplored: result.nodesExplored,
            elapsedMs: Date.now() - startedAt,
            expertTrace: trace,
        };
    });
};
