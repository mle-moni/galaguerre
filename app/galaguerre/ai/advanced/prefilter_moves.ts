import type { GameData, GamePlayer, MinionState } from "#api_types/game.types";
import { getMinionHasTaunt, getMinionIsPoisonous } from "#controllers/games/game_utils";
import { computeEffectiveCost } from "../../dynamic_cost/compute_effective_cost.js";
import type { AiMove } from "../enumerate_ai_moves.js";
import { evaluateMinion } from "./evaluate_game_state.js";

/**
 * Pré-filtrage statique des coups : simuler chaque coup coûte cher (clone + moteur), on ne garde
 * donc que les `topK` plus prometteurs selon une heuristique bon marché, sans aucune simulation.
 *
 * Ce filtre ne fait qu'ORDONNER et TRONQUER : il ne rend jamais un coup illégal jouable.
 */

const findMinion = (board: GamePlayer["board"], uuid: string): MinionState | undefined =>
    board.find((minion) => minion.uuid === uuid);

/** Estime la valeur d'un échange attaquant → défenseur, sans jouer le combat. */
const scoreTrade = (attacker: MinionState, defender: MinionState): number => {
    const attackerValue = evaluateMinion(attacker);
    const defenderValue = evaluateMinion(defender);

    const killsDefender = getMinionIsPoisonous(attacker) || attacker.attack >= defender.health;
    const attackerDies = getMinionIsPoisonous(defender) || defender.attack >= attacker.health;

    let score = 0;
    if (killsDefender) score += defenderValue;
    else score += Math.min(attacker.attack, defender.health) * 0.6;

    if (attackerDies) score -= attackerValue;
    else score -= Math.min(defender.attack, attacker.health) * 0.6;

    // Une Provocation qui saute débloque le reste du plateau.
    if (killsDefender && getMinionHasTaunt(defender)) score += 1.5;

    return score;
};

const scoreFaceDamage = (damage: number, enemyHealth: number): number => {
    if (damage <= 0) return -1;
    // Un coup létal doit toujours remonter en tête du pré-filtre.
    if (damage >= enemyHealth) return 10_000;

    return damage * 0.9;
};

const scoreAttackMove = (
    move: Extract<AiMove, { type: "minion_action" | "weapon_action" }>,
    ai: GamePlayer,
    enemy: GamePlayer,
): number => {
    const attackerValue =
        move.type === "minion_action" ? findMinion(ai.board, move.action.minionId) : undefined;

    const attackPower =
        move.type === "minion_action" ? attackerValue?.attack ?? 0 : ai.weaponState?.damage ?? 0;

    if (move.action.minionUuid === null) {
        return scoreFaceDamage(attackPower, enemy.health);
    }

    const defender = findMinion(enemy.board, move.action.minionUuid);
    if (!defender) return -Infinity;

    if (move.type === "minion_action") {
        if (!attackerValue) return -Infinity;
        return scoreTrade(attackerValue, defender);
    }

    // L'arme perd de la durabilité et le héros encaisse la riposte.
    const killsDefender = attackPower >= defender.health;
    return (killsDefender ? evaluateMinion(defender) : attackPower * 0.6) - defender.attack * 0.8;
};

const scorePlayCardMove = (
    move: Extract<AiMove, { type: "play_card" }>,
    ai: GamePlayer,
    enemy: GamePlayer,
): number => {
    const card = ai.hand.find((handCard) => handCard.uuid === move.action.cardId);
    if (!card) return -Infinity;

    const cost = computeEffectiveCost(card, ai, enemy);

    // À défaut de connaître l'effet, on privilégie l'utilisation efficace du mana : jouer une
    // grosse carte tôt est généralement plus fort que de la garder. La simulation tranchera.
    let score = cost * 1.2;

    if (card.type === "MINION") {
        score += (card.attack + card.health) * 0.5;
        if (card.minionPowers?.hasCharge) score += 1.5;
        if (card.minionPowers?.hasTaunt) score += 0.8;
        score += 0.5 * (card.battlecryActions.length + card.passives.length);
    }

    // Une cible sur le héros adverse est presque toujours du dégât : léger bonus de tri.
    if (
        move.action.actionTarget?.owner === "OPPONENT" &&
        move.action.actionTarget.minionUuid === null
    ) {
        score += 0.5;
    }

    return score;
};

export const scoreMoveStatically = (move: AiMove, data: GameData, aiUserId: number): number => {
    const ai = data.playerOne.userId === aiUserId ? data.playerOne : data.playerTwo;
    const enemy = data.playerOne.userId === aiUserId ? data.playerTwo : data.playerOne;

    switch (move.type) {
        case "minion_action":
        case "weapon_action":
            return scoreAttackMove(move, ai, enemy);
        case "play_card":
            return scorePlayCardMove(move, ai, enemy);
        case "pass_turn":
            return -Infinity;
    }
};

/**
 * Trie les coups par intérêt estimé et ne garde que les `topK` meilleurs.
 * `pass_turn` est exclu : la fin de tour est gérée à part par la recherche.
 */
export const prefilterMoves = (
    moves: AiMove[],
    data: GameData,
    aiUserId: number,
    topK: number,
): AiMove[] => {
    const scored = moves
        .filter((move) => move.type !== "pass_turn")
        .map((move) => ({ move, score: scoreMoveStatically(move, data, aiUserId) }))
        .filter(({ score }) => Number.isFinite(score))
        .sort((a, b) => b.score - a.score);

    return scored.slice(0, topK).map(({ move }) => move);
};
