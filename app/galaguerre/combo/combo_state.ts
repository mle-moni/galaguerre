import type { GamePlayer } from "#api_types/game.types";

export const isComboActive = (player: GamePlayer): boolean => player.cardsPlayedThisTurn >= 1;

export const recordCardPlayedThisTurn = (player: GamePlayer): void => {
    player.cardsPlayedThisTurn++;
};

export const resetCardsPlayedThisTurn = (player: GamePlayer): void => {
    player.cardsPlayedThisTurn = 0;
};
