import type { GamePlayer, PlayerCard } from "#api_types/game.types";
import { shuffleArray } from "../../utils/array.js";

export const generateOpponentDeckDiscoverOptions = (
    opponent: GamePlayer,
    optionCount: number,
): PlayerCard[] => {
    if (optionCount <= 0 || opponent.deckCards.length === 0) return [];

    const shuffled = shuffleArray(opponent.deckCards);
    return shuffled
        .slice(0, Math.min(optionCount, shuffled.length))
        .map((card) => structuredClone(card));
};
