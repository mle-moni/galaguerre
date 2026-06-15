import {
    DEFAULT_HERO_HEALTH,
    MINION_SPOT_IDS,
    type BoardState,
    type GameData,
    type GamePlayer,
    type PlayerCard,
} from "#api_types/game.types";

const countBoardMinions = (playerBoard: BoardState, opponentBoard: BoardState): number => {
    let count = 0;

    for (const spotId of MINION_SPOT_IDS) {
        if (playerBoard[spotId] !== null) count++;
        if (opponentBoard[spotId] !== null) count++;
    }

    return count;
};

const computeReduction = (card: PlayerCard, owner: GamePlayer, opponent: GamePlayer): number => {
    if (!card.dynamicCost) return 0;

    let reduction = 0;

    for (const { source, amountPer } of card.dynamicCost.reductions) {
        switch (source) {
            case "HAND_CARD_COUNT":
                reduction += owner.hand.length * amountPer;
                break;
            case "BOARD_MINION_COUNT":
                reduction += countBoardMinions(owner.board, opponent.board) * amountPer;
                break;
            case "HERO_MISSING_HEALTH":
                reduction += Math.max(0, DEFAULT_HERO_HEALTH - owner.health) * amountPer;
                break;
        }
    }

    return reduction;
};

export const computeEffectiveCost = (
    card: PlayerCard,
    owner: GamePlayer,
    opponent: GamePlayer,
): number => {
    const reduction = computeReduction(card, owner, opponent);
    return Math.max(0, card.baseCost - reduction);
};

export const refreshHandDynamicCosts = (player: GamePlayer, opponent: GamePlayer): void => {
    for (const card of player.hand) {
        if (card.dynamicCost) {
            card.cost = computeEffectiveCost(card, player, opponent);
        }
    }
};

export const refreshGameDynamicCosts = (gameData: GameData): void => {
    refreshHandDynamicCosts(gameData.playerOne, gameData.playerTwo);
    refreshHandDynamicCosts(gameData.playerTwo, gameData.playerOne);
};
