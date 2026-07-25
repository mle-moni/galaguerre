import type { CardActionFieldsSnapshot, GamePlayer } from "#api_types/game.types";

type SummonAction = Extract<CardActionFieldsSnapshot, { type: "SUMMON" }>;

const countDeckCardsById = (player: GamePlayer, cardId: number): number =>
    player.deckCards.filter((card) => card.cardId === cardId).length;

export const resolveSummonCount = (
    action: SummonAction,
    _player: GamePlayer,
    opponent: GamePlayer,
): number => {
    if (!action.summonCountScale) return action.summonCount;

    const { source, cardId, countPer } = action.summonCountScale;
    switch (source) {
        case "OPPONENT_DECK_CARD_COUNT":
            return countDeckCardsById(opponent, cardId) * countPer;
    }
};
