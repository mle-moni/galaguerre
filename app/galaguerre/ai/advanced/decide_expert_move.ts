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
    EXPERT_REPLY_OWN_LETHAL_TIME_SHARE,
    type ExpertAiConfig,
} from "./expert_ai_config.js";
import { createExpertDecisionTrace } from "./expert_decision_trace.js";
import { findLethalSequence } from "./find_lethal.js";
import { createDiscoverPicker } from "./score_discover_option.js";
import { deriveSeed, fallbackWhenSearchNeverRan, searchBestTurn } from "./search_best_turn.js";
import { OWN_LETHAL_BONUS, scoreAfterOpponentReply } from "./search_opponent_reply.js";
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

    // Fin de tour : plus rien à jouer que passer. Le faisceau ne peut alors produire aucun nœud et
    // toute la machinerie — létal, faisceau, ripostes — revient inévitablement à la séquence vide.
    // On le dit tout de suite plutôt que de le redécouvrir : c'est une décision par tour joué, et
    // elle représentait à elle seule 23 % des décisions du banc, comptées à tort comme un repli.
    if (legalMoves.every((move) => move.type === "pass_turn")) {
        trace.fallback = "NOTHING_TO_PLAY";

        return {
            moves: [],
            isLethal: false,
            nodesExplored: 0,
            elapsedMs: Date.now() - startedAt,
            expertTrace: trace,
        };
    }

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
        let bestScore = Number.NEGATIVE_INFINITY;

        // Classement fantôme, mené en parallèle sans la prime de létal propre. Il ne pilote rien :
        // il sert uniquement à savoir si le troisième pli a DÉPLACÉ le choix ou s'il s'est contenté
        // de renchérir sur une ligne déjà en tête. Sans ce témoin, un pli inutile et un pli
        // décisif rendent exactement les mêmes compteurs.
        let bestUnprimedMoves: AiMove[] | null = null;
        let bestUnprimedScore = Number.NEGATIVE_INFINITY;

        // Classement de SECOURS, tenu sur les seules lignes dont le faisceau de riposte a bel et
        // bien tourné mais dont le létal adverse n'a pas pu être réfuté. Il ne sert que si aucune
        // ligne n'est complète — voir plus bas.
        let bestUnprovenMoves: AiMove[] | null = null;
        let bestUnprovenScore = Number.NEGATIVE_INFINITY;

        for (const [index, candidate] of candidates.entries()) {
            // Une ligne qui gagne la partie ce tour-ci n'a pas de suite à simuler.
            if (candidate.finished) {
                if (candidate.endScore > bestScore) {
                    bestScore = candidate.endScore;
                    bestMoves = candidate.moves;
                }
                if (candidate.endScore > bestUnprimedScore) {
                    bestUnprimedScore = candidate.endScore;
                    bestUnprimedMoves = candidate.moves;
                }
                continue;
            }

            // Tranche recalculée à chaque tour sur les candidats RESTANTS : figée d'avance, un
            // candidat qui déborde affamerait tous les suivants. En mode déterministe il n'y a pas
            // d'horloge : chaque candidat reçoit son plein plafond de nœuds.
            const sliceStartedAt = Date.now();
            const remainingMs = replyDeadline - sliceStartedAt;
            const perCandidateMs = Math.floor(remainingMs / (candidates.length - index));

            // Sous le plancher, la riposte n'aurait pas le temps de simuler quoi que ce soit :
            // mieux vaut un candidat écarté qu'un candidat noté sur un adversaire supposé passif.
            if (!deterministic && perCandidateMs < MIN_REPLY_SLICE_MS) {
                trace.repliesSkipped += candidates.length - index;
                break;
            }

            const sliceEnd = Math.min(replyDeadline, sliceStartedAt + perCandidateMs);

            // Le troisième pli, quand il est actif, se réserve la QUEUE de la tranche. Sans cette
            // retenue il n'aurait que le reliquat du faisceau de riposte — souvent zéro — et la
            // prime de létal ne tomberait que sur les candidats évalués les premiers : un
            // classement décidé par l'ordre de passage, exactement ce que la tranche existe pour
            // empêcher.
            const ownLethalEnabled = config.replyOwnLethalMaxNodes > 0;
            const replyMs = ownLethalEnabled
                ? perCandidateMs * (1 - EXPERT_REPLY_OWN_LETHAL_TIME_SHARE)
                : perCandidateMs;
            const candidateDeadline = deterministic
                ? NO_DEADLINE
                : Math.min(replyDeadline, sliceStartedAt + replyMs);

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
                    : sliceStartedAt + replyMs * EXPERT_REPLY_LETHAL_TIME_SHARE,
                ownLethalMaxNodes: config.replyOwnLethalMaxNodes,
                ownLethalDeadline: deterministic ? NO_DEADLINE : sliceEnd,
                pickDiscoverOption,
                // Graine dérivée de la ligne candidate : sa riposte est donc simulée sur le même
                // aléatoire quel que soit son rang dans le classement.
                seed: deriveSeed(seed, candidate.moves),
            });

            if (reply.opponentHasLethal) trace.sawOpponentLethal = true;
            if (reply.ownHasLethal) trace.sawOwnLethal = true;

            // Une riposte tronquée rend le score d'un adversaire passif, très au-dessus de toute
            // ligne réellement évaluée : la comparer reviendrait à préférer systématiquement la
            // ligne qu'on a le moins regardée.
            if (!reply.complete) {
                trace.repliesIncomplete++;

                // Une riposte SIMULÉE dont seul le létal adverse reste indécis n'est pas un score
                // imaginaire : c'est un vrai score de riposte auquel il manque une preuve. On le
                // garde de côté, à part, pour le seul cas où plus rien d'autre ne serait
                // disponible. Il ne concourt jamais contre une ligne complète — l'absence de
                // preuve de létal joue mécaniquement en sa faveur.
                if (reply.replySearched && reply.score > bestUnprovenScore) {
                    bestUnprovenScore = reply.score;
                    bestUnprovenMoves = candidate.moves;
                }

                continue;
            }

            trace.repliesScored++;

            if (reply.score > bestScore) {
                bestScore = reply.score;
                bestMoves = candidate.moves;
            }

            const unprimedScore = reply.ownHasLethal ? reply.score - OWN_LETHAL_BONUS : reply.score;

            if (unprimedScore > bestUnprimedScore) {
                bestUnprimedScore = unprimedScore;
                bestUnprimedMoves = candidate.moves;
            }
        }

        // Comparaison par IDENTITÉ : les lignes candidates sont des objets distincts rendus par le
        // faisceau, deux d'entre elles ne sont jamais le même tableau.
        trace.ownLethalChangedChoice = bestMoves !== bestUnprimedMoves;

        if (bestMoves === null) trace.fallback = "NO_COMPLETE_REPLY";

        // Aucune ligne complète, mais des ripostes ont malgré tout été simulées : les départager
        // entre elles vaut mieux que de rendre la main au faisceau, qui n'a JAMAIS regardé la
        // riposte. Comparer des lignes également incertaines reste une comparaison ; renoncer,
        // c'est jeter le pli entier de l'Expert pour une preuve manquante.
        const rankedFallback =
            config.replyRankIncomplete > 0 && bestMoves === null ? bestUnprovenMoves : null;

        trace.incompleteRankingChangedChoice =
            rankedFallback !== null && rankedFallback !== beamMoves;

        return {
            // Aucun candidat départagé : on rend la meilleure ligne du faisceau, c'est-à-dire le
            // choix qu'aurait fait l'IA Avancée. C'est la dégradation propre annoncée en tête de
            // fichier, et elle vaut mieux qu'un classement tiré au sort par le chronomètre.
            moves: bestMoves ?? rankedFallback ?? beamMoves,
            isLethal: false,
            nodesExplored: result.nodesExplored,
            elapsedMs: Date.now() - startedAt,
            expertTrace: trace,
        };
    });
};
