import type { GameData } from "#api_types/game.types";
import { applyAiMove, type DiscoverOptionPicker } from "../../simulation/apply_ai_move.js";
import { findLethalSequence } from "./find_lethal.js";
import {
    evaluateGameState,
    getWeightsForProfile,
    WIN_SCORE,
    type EvaluationWeights,
} from "./evaluate_game_state.js";
import { MAX_SEARCH_DEPTH } from "./advanced_ai_config.js";
import { createDiscoverPicker } from "./score_discover_option.js";
import { searchBestTurn } from "./search_best_turn.js";

/**
 * Note un état de FIN de tour de l'IA en simulant le meilleur tour que l'adversaire jouerait
 * ensuite — le pli manquant de l'IA Avancée, et la seule raison pour laquelle un bon joueur la
 * bat : elle ne regarde jamais ce qui lui arrive après avoir posé son plateau.
 *
 * C'est ici que l'omniscience de l'IA Expert paie. `applyAiMove(..., { type: "pass_turn" })` fait
 * piocher à l'adversaire sa VRAIE carte (l'ordre du deck est dans `GameData`), et
 * `enumerateAiMoves(game, opponentUserId)` énumère ses coups depuis sa VRAIE main. La réplique
 * simulée n'est donc pas un pari sur ce que l'adversaire pourrait avoir : c'est ce qu'il a.
 *
 * En sortent gratuitement, sans une seule heuristique dédiée : ne pas sur-déployer dans un
 * balayage adverse, poser une provocation quand elle change le tour d'en face, garder un retrait
 * pour la menace réelle, et foncer au visage quand la défense est de toute façon perdue.
 */

/** Poids prêtés à l'adversaire humain, qui n'a pas d'archétype déclaré : le jeu « équilibré ». */
const OPPONENT_WEIGHTS: EvaluationWeights = getWeightsForProfile(undefined);

/**
 * Pénalité d'une ligne qui laisse un létal adverse. Volontairement en dessous de `WIN_SCORE` :
 * quand TOUTES les lignes meurent, l'IA doit encore pouvoir choisir la moins pire — et surtout
 * préférer une ligne où elle gagne avant.
 */
export const OPPONENT_LETHAL_PENALTY = -WIN_SCORE / 2;

export interface OpponentReplyOptions {
    aiUserId: number;
    opponentUserId: number;
    /** Poids de l'IA, pour noter l'état final de son point de vue. */
    weights: EvaluationWeights;
    beamWidth: number;
    topK: number;
    maxNodes: number;
    deadline: number;
    pickDiscoverOption: DiscoverOptionPicker;
}

export const scoreAfterOpponentReply = async (
    endOfTurnData: GameData,
    {
        aiUserId,
        opponentUserId,
        weights,
        beamWidth,
        topK,
        maxNodes,
        deadline,
        pickDiscoverOption,
    }: OpponentReplyOptions,
): Promise<number> => {
    // Passer le tour déclenche la pioche et les passifs de début de tour adverses : c'est le
    // moteur réel qui les résout, pas une approximation.
    const passed = await applyAiMove(
        endOfTurnData,
        aiUserId,
        { type: "pass_turn" },
        pickDiscoverOption,
    );

    if (passed.finished) {
        return evaluateGameState(passed.data, aiUserId, weights, { omniscient: true });
    }

    // Pendant le tour simulé de l'adversaire, ce sont SES découvertes qui se résolvent : les
    // noter avec le sélecteur de l'IA lui ferait choisir ce qui arrange l'IA, donc sous-estimer
    // la réplique. On lui prête son propre sélecteur.
    const pickOpponentDiscoverOption = createDiscoverPicker(opponentUserId, undefined);

    // Le létal adverse d'abord : c'est l'information qui doit dominer le choix de la ligne.
    const lethal = await findLethalSequence(passed.data, {
        aiUserId: opponentUserId,
        maxNodes: Math.max(50, Math.floor(maxNodes / 2)),
        deadline,
        pickDiscoverOption: pickOpponentDiscoverOption,
    });

    if (lethal && lethal.length > 0) return OPPONENT_LETHAL_PENALTY;

    // L'adversaire simulé joue en information INCOMPLÈTE, comme le joueur humain qu'il représente.
    // Le rendre omniscient à son tour modéliserait un adversaire plus fort que le vrai, et rendrait
    // l'Expert trop prudent : il jouerait autour de menaces que son adversaire ne peut pas voir.
    const reply = await searchBestTurn(passed.data, {
        aiUserId: opponentUserId,
        weights: OPPONENT_WEIGHTS,
        beamWidth,
        topK,
        maxNodes,
        maxDepth: MAX_SEARCH_DEPTH,
        deadline,
        pickDiscoverOption: pickOpponentDiscoverOption,
    });

    // La recherche adverse a rendu des états notés de SON point de vue : on les renote du nôtre.
    const bestForOpponent = reply.candidates[0];
    const afterReply = bestForOpponent?.data ?? passed.data;

    return evaluateGameState(afterReply, aiUserId, weights, { omniscient: true });
};
