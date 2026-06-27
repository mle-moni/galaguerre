import type { CardActionFieldsSnapshot, GamePlayer } from "#api_types/game.types";
import type Game from "#models/game";
import { instantiateDeckCard } from "./deck_card_operations.js";
import { giveCardToHand } from "./give_card_to_hand.js";

export const addCardsToHand = (
    player: GamePlayer,
    cardId: number,
    copyCount: number,
    game?: Game,
): number => {
    let added = 0;

    for (let i = 0; i < copyCount; i++) {
        const card = instantiateDeckCard(cardId);
        if (!card) break;

        const result = giveCardToHand(player, card, game, { source: "GENERATED" });
        if (result === "added") {
            added++;
        }
    }

    return added;
};

const applyHandCardOperationToPlayer = (
    targetPlayer: GamePlayer,
    action: Extract<CardActionFieldsSnapshot, { type: "HAND_CARD" }>,
    game: Game,
): void => {
    addCardsToHand(targetPlayer, action.cardId, action.copyCount, game);
};

export const executeHandCardAction = (
    action: Extract<CardActionFieldsSnapshot, { type: "HAND_CARD" }>,
    game: Game,
    player: GamePlayer,
    opponent: GamePlayer,
): void => {
    switch (action.handTargetTeam) {
        case "PLAYER":
            applyHandCardOperationToPlayer(player, action, game);
            break;
        case "OPPONENT":
            applyHandCardOperationToPlayer(opponent, action, game);
            break;
        case "ALL":
            applyHandCardOperationToPlayer(player, action, game);
            applyHandCardOperationToPlayer(opponent, action, game);
            break;
    }
};
