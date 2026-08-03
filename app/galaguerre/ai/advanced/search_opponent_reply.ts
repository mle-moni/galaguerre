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
    /**
     * Plafond de nœuds de la recherche de létal ADVERSE, indépendant de celui du faisceau de
     * riposte. Rater un létal adverse est l'erreur la plus chère de tout le moteur : la ligne est
     * alors créditée d'une riposte inoffensive et l'IA meurt au tour suivant. Cette recherche
     * n'est coûteuse que lorsqu'une menace existe — la borne optimiste de dégâts la coupe à la
     * racine sinon — donc l'élargir se paie surtout dans les positions où il faut savoir.
     *
     * Défaut : la moitié de `maxNodes`, la valeur historique.
     */
    lethalMaxNodes?: number;
    /**
     * Échéance propre au létal adverse, bornée par `deadline`. Sans elle, le létal peut consommer
     * toute la tranche de la ligne candidate et laisser le faisceau de riposte à zéro nœud — donc
     * une riposte incomplète, donc un candidat écarté.
     *
     * Défaut : `deadline`, le comportement historique.
     */
    lethalDeadline?: number;
    pickDiscoverOption: DiscoverOptionPicker;
    /** Graine de base de la recherche adverse ; à faire varier d'une ligne candidate à l'autre. */
    seed: number;
}

export interface OpponentReplyResult {
    score: number;
    /** `true` quand un létal adverse a été PROUVÉ sur cette ligne. */
    opponentHasLethal: boolean;
    /**
     * `false` quand le budget a manqué avant d'avoir vraiment simulé la riposte. Le score rendu
     * est alors celui d'un adversaire PASSIF — mécaniquement le plus haut possible, et donc
     * incomparable avec celui d'une ligne réellement évaluée. L'appelant doit écarter ces
     * candidats plutôt que de les créditer d'une riposte inoffensive qu'il n'a pas vérifiée.
     */
    complete: boolean;
}

/**
 * `true` quand l'état évalué met fin au tour de l'IA : son mana restant est alors définitivement
 * perdu. `setupNextGameTurn` ne réinitialise que le mana du joueur SUIVANT, donc `ai.mana` porte
 * encore ici ce que l'IA n'a pas dépensé — c'est bien la même pénalité que celle appliquée par le
 * faisceau (`scoreEndOfTurn`), sans laquelle le classement final perdrait le signal « dépense
 * ton mana ».
 */
const AI_TURN_IS_OVER = { isEndOfTurn: true, omniscient: true } as const;

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
        lethalMaxNodes = Math.max(50, Math.floor(maxNodes / 2)),
        lethalDeadline = deadline,
        pickDiscoverOption,
        seed,
    }: OpponentReplyOptions,
): Promise<OpponentReplyResult> => {
    // Passer le tour déclenche la pioche et les passifs de début de tour adverses : c'est le
    // moteur réel qui les résout, pas une approximation.
    const passed = await applyAiMove(
        endOfTurnData,
        aiUserId,
        { type: "pass_turn" },
        pickDiscoverOption,
    );

    if (passed.finished) {
        return {
            score: evaluateGameState(passed.data, aiUserId, weights, AI_TURN_IS_OVER),
            opponentHasLethal: false,
            complete: true,
        };
    }

    // Pendant le tour simulé de l'adversaire, ce sont SES découvertes qui se résolvent : les
    // noter avec le sélecteur de l'IA lui ferait choisir ce qui arrange l'IA, donc sous-estimer
    // la réplique. On lui prête son propre sélecteur.
    const pickOpponentDiscoverOption = createDiscoverPicker(opponentUserId, undefined);

    // Le létal adverse d'abord : c'est l'information qui doit dominer le choix de la ligne.
    const lethal = await findLethalSequence(passed.data, {
        aiUserId: opponentUserId,
        maxNodes: lethalMaxNodes,
        deadline: Math.min(deadline, lethalDeadline),
        pickDiscoverOption: pickOpponentDiscoverOption,
    });

    if (lethal.moves && lethal.moves.length > 0) {
        return { score: OPPONENT_LETHAL_PENALTY, opponentHasLethal: true, complete: true };
    }

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
        seed,
    });

    // La recherche adverse a rendu des états notés de SON point de vue : on les renote du nôtre.
    const bestForOpponent = reply.candidates[0];
    const afterReply = bestForOpponent?.data ?? passed.data;

    return {
        score: evaluateGameState(afterReply, aiUserId, weights, AI_TURN_IS_OVER),
        opponentHasLethal: false,
        // Un létal adverse non prouvé, ou un faisceau qui n'a rien simulé faute de temps : dans
        // les deux cas la riposte n'a pas été vue, elle a été supposée inexistante. Zéro nœud
        // exploré AVANT l'échéance est en revanche un résultat légitime — l'adversaire n'avait
        // simplement aucun coup à jouer.
        complete: !lethal.exhausted && (reply.nodesExplored > 0 || Date.now() <= deadline),
    };
};
