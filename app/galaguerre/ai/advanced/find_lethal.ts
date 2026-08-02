import type { GameData } from "#api_types/game.types";
import {
    canMinionAttack,
    canWeaponAttack,
    getMinionAttacksThisRound,
    getMinionMaxAttacks,
} from "#controllers/games/game_utils";
import { applyAiMove, type DiscoverOptionPicker } from "../../simulation/apply_ai_move.js";
import { enumerateAiMoves, type AiMove } from "../enumerate_ai_moves.js";
import { createSimulationGame } from "../../simulation/simulation_game.js";

/**
 * Recherche exhaustive (bornée) d'une séquence létale sur le tour en cours.
 *
 * La recherche en faisceau trouve la plupart des létaux, mais son élagage peut manquer les lignes
 * contre-intuitives (frapper d'abord la Provocation avec le « mauvais » monstre pour libérer les
 * dégâts des autres). Rater un létal étant l'erreur la plus coûteuse qu'une IA puisse commettre,
 * on le cherche à part, en DFS et sans heuristique.
 *
 * La recherche reste bon marché grâce à une borne optimiste de dégâts : dès qu'elle ne suffit
 * plus à tuer, la branche est coupée. S'y ajoutent un plafond de nœuds et une échéance.
 */

export interface FindLethalOptions {
    aiUserId: number;
    maxNodes: number;
    deadline: number;
    pickDiscoverOption: DiscoverOptionPicker;
}

export interface LethalSearchResult {
    /** La séquence létale, ou `null` si elle n'a pas été trouvée. */
    moves: AiMove[] | null;
    /**
     * `true` quand la recherche s'est arrêtée sur son budget (nœuds ou échéance) : `moves: null`
     * ne prouve alors PAS l'absence de létal, il dit seulement qu'on n'a pas fini de regarder.
     * Un appelant qui confond les deux prend une décision sur une information qu'il n'a pas.
     */
    exhausted: boolean;
}

const enemyOf = (data: GameData, aiUserId: number) =>
    data.playerOne.userId === aiUserId ? data.playerTwo : data.playerOne;

/** Majoration très grossière des dégâts qu'une carte peut ajouter, par point de mana. */
const DAMAGE_PER_MANA = 3;

/**
 * Borne supérieure optimiste des dégâts encore disponibles ce tour-ci. Si elle ne suffit pas à
 * tuer, aucune séquence ne le peut : on coupe la branche immédiatement.
 *
 * On lit le plateau DIRECTEMENT, sans passer par `enumerateAiMoves` : l'énumération ne propose
 * aucune cible visage tant qu'une Provocation tient le plateau adverse, ce qui ramenait la borne à
 * zéro et coupait à la racine tous les létaux passant par le retrait de cette Provocation —
 * précisément les lignes que cette recherche existe pour trouver.
 *
 * On ignore donc volontairement Provocation et Rush : sur-estimer ne coûte que du temps de
 * recherche, sous-estimer fait rater un létal.
 */
const optimisticRemainingDamage = (data: GameData, aiUserId: number): number => {
    const ai = data.playerOne.userId === aiUserId ? data.playerOne : data.playerTwo;
    const currentRound = data.currentRound;

    let total = 0;

    for (const minion of ai.board) {
        if (!canMinionAttack(minion, currentRound)) continue;

        // Une Furie des vents non encore utilisée frappe deux fois : la borne doit les compter.
        const remainingAttacks =
            getMinionMaxAttacks(minion) - getMinionAttacksThisRound(minion, currentRound);

        total += Math.max(0, minion.attack) * Math.max(0, remainingAttacks);
    }

    if (canWeaponAttack(ai, ai.weaponState ?? null, currentRound)) {
        total += Math.max(0, ai.weaponState?.damage ?? 0);
    }

    // Les cartes en main peuvent ajouter des dégâts : on majore par le mana disponible (une carte
    // ne peut pas infliger arbitrairement plus que son coût le suggère). Les cartes à coût nul
    // échappent à cette majoration, on leur prête donc leur propre budget.
    const freeCards = ai.hand.filter((card) => card.cost <= 0).length;
    total += (ai.mana + freeCards) * DAMAGE_PER_MANA;

    return total;
};

/**
 * Tous les coups sauf « passer », qui met fin au tour et donc à toute ligne létale.
 *
 * On ne filtre volontairement PAS sur « ce coup inflige-t-il des dégâts » : tuer une Provocation,
 * buffer un attaquant ou invoquer un monstre avec Charge sont autant d'étapes intermédiaires
 * d'un létal. C'est la borne optimiste de dégâts qui fait l'élagage, pas un filtre sur le type.
 */
const lethalCandidateMoves = (moves: AiMove[]): AiMove[] =>
    moves.filter((move) => move.type !== "pass_turn");

export const findLethalSequence = async (
    data: GameData,
    { aiUserId, maxNodes, deadline, pickDiscoverOption }: FindLethalOptions,
): Promise<LethalSearchResult> => {
    let nodes = 0;
    let exhausted = false;

    const outOfBudget = (): boolean => {
        if (nodes >= maxNodes || Date.now() > deadline) exhausted = true;

        return exhausted;
    };

    const search = async (state: GameData, path: AiMove[]): Promise<AiMove[] | null> => {
        if (outOfBudget()) return null;

        const enemy = enemyOf(state, aiUserId);
        if (enemy.health <= 0) return path;

        if (optimisticRemainingDamage(state, aiUserId) < enemy.health) return null;

        const game = createSimulationGame(state);
        const moves = lethalCandidateMoves(enumerateAiMoves(game, aiUserId));

        // Frapper le héros en premier : c'est la ligne létale la plus courte quand elle existe.
        moves.sort((a, b) => Number(isFaceMove(b)) - Number(isFaceMove(a)));

        for (const move of moves) {
            if (outOfBudget()) return null;
            nodes++;

            const result = await applyAiMove(state, aiUserId, move, pickDiscoverOption);
            if (!result.applied) continue;

            const nextEnemy = enemyOf(result.data, aiUserId);
            const ai =
                result.data.playerOne.userId === aiUserId
                    ? result.data.playerOne
                    : result.data.playerTwo;

            // Une ligne qui tue l'IA au passage n'est pas un létal.
            if (ai.health <= 0) continue;
            if (nextEnemy.health <= 0) return [...path, move];

            const found = await search(result.data, [...path, move]);
            if (found) return found;
        }

        return null;
    };

    const moves = await search(data, []);

    // Une ligne trouvée reste une ligne trouvée, même si le budget a sauté ailleurs dans l'arbre.
    return { moves, exhausted: moves === null && exhausted };
};

const isFaceMove = (move: AiMove): boolean =>
    (move.type === "minion_action" || move.type === "weapon_action") &&
    move.action.minionUuid === null;
