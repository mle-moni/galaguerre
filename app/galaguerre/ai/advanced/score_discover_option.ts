import type { AiDeckProfile, GameData, PlayerCard } from "#api_types/game.types";
import type { DiscoverOptionPicker } from "../../simulation/apply_ai_move.js";

/**
 * Choix de découverte de l'IA avancée : remplace le tirage uniforme de l'IA débutante.
 *
 * On note chaque option sur ses stats brutes, ses mots-clés, sa jouabilité immédiate et sa
 * synergie de famille avec l'archétype du deck.
 */

/** Famille sur laquelle l'archétype aggro est construit. */
const AGGRO_SYNERGY_TAG = "PETS";

const scoreMinionOption = (card: Extract<PlayerCard, { type: "MINION" }>): number => {
    let score = card.attack + card.health + 0.5 * Math.min(card.attack, card.health);

    const powers = card.minionPowers;
    if (powers?.hasTaunt) score += 1;
    if (powers?.hasDivineShield) score += 1.5;
    if (powers?.isPoisonous) score += 2;
    if (powers?.hasCharge) score += 1.5;
    if (powers?.hasRush) score += 1;
    if (powers?.hasWindfury) score += 0.6 * card.attack;

    score += 0.8 * (card.battlecryActions.length + card.passives.length);
    score += 0.6 * card.deathrattleActions.length;

    return score;
};

const scoreCardValue = (card: PlayerCard): number => {
    switch (card.type) {
        case "MINION":
            return scoreMinionOption(card);
        case "SPELL":
            // Un sort n'a pas de corps : sa valeur tient à son effet, approximée par son coût.
            return 1.5 * card.cost + 1.2 * card.spellActions.length;
        case "WEAPON":
            return 1.2 * card.damage * card.durability;
    }
};

export interface ScoreDiscoverOptions {
    /**
     * IA Expert uniquement : autorise la lecture du plateau adverse pour préférer la réponse
     * qui traite ce qui est réellement en face (voir la règle d'équité de `evaluate_game_state`).
     */
    omniscient?: boolean;
}

export const scoreDiscoverOption = (
    card: PlayerCard,
    data: GameData,
    aiUserId: number,
    profile: AiDeckProfile | undefined,
    { omniscient = false }: ScoreDiscoverOptions = {},
): number => {
    const ai = data.playerOne.userId === aiUserId ? data.playerOne : data.playerTwo;
    const enemy = data.playerOne.userId === aiUserId ? data.playerTwo : data.playerOne;

    let score = scoreCardValue(card);

    // Une carte jouable dès maintenant vaut mieux qu'une carte bloquée en main.
    if (card.cost <= ai.mana) score += 2;

    // Au-delà du mana maximum atteignable dans un futur proche, la carte risque de rester morte.
    const reachableMana = Math.min(10, data.currentRound + 2);
    if (card.cost > reachableMana) score -= 2 * (card.cost - reachableMana);

    if (profile === "AGGRO") {
        if (card.tags?.includes(AGGRO_SYNERGY_TAG)) score += 3;
        // L'aggro veut de la pression tout de suite, pas des cartes chères.
        score -= 0.8 * card.cost;
    }

    if (omniscient) {
        // Une main adverse pleine annonce un tour chargé : la découverte doit tenir le plateau.
        const pressure = enemy.board.length + 0.5 * enemy.hand.length;
        if (card.type === "MINION" && card.minionPowers?.hasTaunt) score += 0.5 * pressure;
    }

    return score;
};

export const createDiscoverPicker = (
    aiUserId: number,
    profile: AiDeckProfile | undefined,
    options: ScoreDiscoverOptions = {},
): DiscoverOptionPicker => {
    return (cards, data) => {
        let best = cards[0]!;
        let bestScore = -Infinity;

        for (const card of cards) {
            const score = scoreDiscoverOption(card, data, aiUserId, profile, options);
            if (score > bestScore) {
                bestScore = score;
                best = card;
            }
        }

        return best;
    };
};
