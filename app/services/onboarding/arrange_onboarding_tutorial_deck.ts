import type { PlayerCard } from "#api_types/game.types";

/** Human opening hand when going first: two unplayable cards + one 1-mana minion. */
export const ONBOARDING_HUMAN_OPENING_HAND_CARD_IDS = [80, 101, 62] as const;

/** Drawn from the top of the deck when the human mulligans expensive cards away. */
export const ONBOARDING_HUMAN_MULLIGAN_TOP_CARD_IDS = [76, 87] as const;

/** AI opening hand includes a 1-mana taunt to teach Provocation later. */
export const ONBOARDING_AI_OPENING_HAND_CARD_IDS = [82, 95, 64, 71] as const;

const pickCardsByCardIds = (
    cards: PlayerCard[],
    cardIds: readonly number[],
): { picked: PlayerCard[]; remaining: PlayerCard[] } => {
    const remaining = [...cards];
    const picked: PlayerCard[] = [];

    for (const cardId of cardIds) {
        const index = remaining.findIndex((card) => card.cardId === cardId);
        if (index === -1) {
            throw new Error(`Onboarding tutorial card ${cardId} not found in deck`);
        }

        picked.push(remaining.splice(index, 1)[0]!);
    }

    return { picked, remaining };
};

export const arrangeOnboardingTutorialDeck = (
    cards: PlayerCard[],
    openingHandCardIds: readonly number[],
    mulliganTopCardIds: readonly number[],
): PlayerCard[] => {
    const { picked: openingHand, remaining: afterOpening } = pickCardsByCardIds(
        cards,
        openingHandCardIds,
    );
    const { picked: mulliganTop, remaining: deckRest } = pickCardsByCardIds(
        afterOpening,
        mulliganTopCardIds,
    );

    return [...openingHand, ...mulliganTop, ...deckRest];
};
