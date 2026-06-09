import type { GamePlayer, PlayerNumber } from "#api_types/game.types";
import type Game from "#models/game";
import { shuffleArray } from "../../../utils/array.js";

export const performMulliganOnPlayer = (player: GamePlayer, cardIds: string[]): void => {
    const uniqueCardIds = [...new Set(cardIds)];
    const cardsToReplace = player.hand.filter((card) => uniqueCardIds.includes(card.uuid));

    if (cardsToReplace.length !== uniqueCardIds.length) {
        throw new Error("Invalid mulligan card selection");
    }

    const keptCards = player.hand.filter((card) => !uniqueCardIds.includes(card.uuid));
    const replacements: typeof player.hand = [];

    for (let index = 0; index < cardsToReplace.length; index++) {
        const replacement = player.deckCards.shift();
        if (replacement) {
            replacements.push(replacement);
        }
    }

    player.hand = [...keptCards, ...replacements];
    player.deckCards.push(...cardsToReplace);
    player.deckCards = shuffleArray(player.deckCards);
};

export const autoConfirmPendingMulligans = (game: Game): void => {
    if (!game.data.mulligan) return;

    game.data.mulligan.playerOneDone = true;
    game.data.mulligan.playerTwoDone = true;
};

export const markMulliganDone = (game: Game, playerType: PlayerNumber): void => {
    if (!game.data.mulligan) {
        game.data.mulligan = { playerOneDone: false, playerTwoDone: false };
    }

    if (playerType === "PLAYER_ONE") {
        game.data.mulligan.playerOneDone = true;
        return;
    }

    game.data.mulligan.playerTwoDone = true;
};

export const bothPlayersMulliganDone = (game: Game): boolean =>
    Boolean(game.data.mulligan?.playerOneDone && game.data.mulligan?.playerTwoDone);
