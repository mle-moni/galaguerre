import {
    DEFAULT_HERO_HEALTH,
    type BoardState,
    type GameData,
    type GamePlayer,
    type PlayerCard,
} from "#api_types/game.types";

const countBoardMinions = (playerBoard: BoardState, opponentBoard: BoardState): number => {
    return playerBoard.length + opponentBoard.length;
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
    const dynamicReduction = computeReduction(card, owner, opponent);
    const handReduction = card.handCostReduction ?? 0;
    const spellCostReduction = card.type === "SPELL" ? owner.nextSpellCostReduction ?? 0 : 0;
    return Math.max(0, card.baseCost - dynamicReduction - handReduction - spellCostReduction);
};

export const clearHandCostReduction = <T extends PlayerCard>(card: T): T => {
    delete card.handCostReduction;
    return card;
};

export const clearNextSpellCostReduction = (player: GamePlayer): void => {
    delete player.nextSpellCostReduction;
};

export const refreshHandDynamicCosts = (player: GamePlayer, opponent: GamePlayer): void => {
    const hasSpellCostReduction = (player.nextSpellCostReduction ?? 0) > 0;

    for (const card of player.hand) {
        if (
            card.dynamicCost ||
            (card.handCostReduction ?? 0) > 0 ||
            (hasSpellCostReduction && card.type === "SPELL")
        ) {
            card.cost = computeEffectiveCost(card, player, opponent);
        }
    }
};

export const refreshGameDynamicCosts = (gameData: GameData): void => {
    refreshHandDynamicCosts(gameData.playerOne, gameData.playerTwo);
    refreshHandDynamicCosts(gameData.playerTwo, gameData.playerOne);
};
