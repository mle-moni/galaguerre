import type { GameData } from "#api_types/game.types";
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

const enemyOf = (data: GameData, aiUserId: number) =>
    data.playerOne.userId === aiUserId ? data.playerTwo : data.playerOne;

/**
 * Borne supérieure optimiste des dégâts encore disponibles ce tour-ci. Si elle ne suffit pas à
 * tuer, aucune séquence ne le peut : on coupe la branche immédiatement.
 */
const optimisticRemainingDamage = (data: GameData, aiUserId: number): number => {
    const game = createSimulationGame(data);
    const ai = data.playerOne.userId === aiUserId ? data.playerOne : data.playerTwo;

    let total = 0;

    for (const move of enumerateAiMoves(game, aiUserId)) {
        if (move.type === "minion_action" && move.action.minionUuid === null) {
            const minion = ai.board.find((candidate) => candidate.uuid === move.action.minionId);
            total += Math.max(0, minion?.attack ?? 0);
        }
    }

    if (ai.weaponState) {
        total += Math.max(0, ai.weaponState.damage);
    }

    // Les cartes en main peuvent ajouter des dégâts : on majore très grossièrement par le mana
    // disponible (une carte ne peut pas infliger arbitrairement plus que son coût le suggère).
    total += ai.mana * 3;

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
): Promise<AiMove[] | null> => {
    let nodes = 0;

    const search = async (state: GameData, path: AiMove[]): Promise<AiMove[] | null> => {
        if (nodes >= maxNodes || Date.now() > deadline) return null;

        const enemy = enemyOf(state, aiUserId);
        if (enemy.health <= 0) return path;

        if (optimisticRemainingDamage(state, aiUserId) < enemy.health) return null;

        const game = createSimulationGame(state);
        const moves = lethalCandidateMoves(enumerateAiMoves(game, aiUserId));

        // Frapper le héros en premier : c'est la ligne létale la plus courte quand elle existe.
        moves.sort((a, b) => Number(isFaceMove(b)) - Number(isFaceMove(a)));

        for (const move of moves) {
            if (nodes >= maxNodes || Date.now() > deadline) return null;
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

    return search(data, []);
};

const isFaceMove = (move: AiMove): boolean =>
    (move.type === "minion_action" || move.type === "weapon_action") &&
    move.action.minionUuid === null;
