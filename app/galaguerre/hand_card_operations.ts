import type { CardActionFieldsSnapshot, GamePlayer } from "#api_types/game.types";
import type Game from "#models/game";
import { instantiateDeckCard } from "./deck_card_operations.js";

export const addCardsToHand = (player: GamePlayer, cardId: number, copyCount: number): number => {
    let added = 0;

    for (let i = 0; i < copyCount; i++) {
        const card = instantiateDeckCard(cardId);
        if (!card) break;

        player.hand.push(card);
        added++;
    }

    return added;
};

const applyHandCardOperationToPlayer = (
    targetPlayer: GamePlayer,
    action: Extract<CardActionFieldsSnapshot, { type: "HAND_CARD" }>,
): void => {
    addCardsToHand(targetPlayer, action.cardId, action.copyCount);
};

export const executeHandCardAction = (
    action: Extract<CardActionFieldsSnapshot, { type: "HAND_CARD" }>,
    _game: Game,
    player: GamePlayer,
    opponent: GamePlayer,
): void => {
    switch (action.handTargetTeam) {
        case "PLAYER":
            applyHandCardOperationToPlayer(player, action);
            break;
        case "OPPONENT":
            applyHandCardOperationToPlayer(opponent, action);
            break;
        case "ALL":
            applyHandCardOperationToPlayer(player, action);
            applyHandCardOperationToPlayer(opponent, action);
            break;
    }
};
