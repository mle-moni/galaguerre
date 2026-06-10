import type { ApiDeckCardEntry } from "#api_types/deck.types";
import Card from "#models/card";
import Deck from "#models/deck";
import DeckCard from "#models/deck_card";
import type { ManyToManyQueryBuilderContract } from "@adonisjs/lucid/types/relations";

export const preloadDeckCardSet = (
    query: ManyToManyQueryBuilderContract<typeof Card, typeof DeckCard>,
) => {
    query.preload("cardSet");
};

export const deckCardsToEntries = (deck: Deck): ApiDeckCardEntry[] => {
    const counts = new Map<number, number>();

    for (const card of deck.cards) {
        counts.set(card.id, (counts.get(card.id) ?? 0) + 1);
    }

    return [...counts.entries()].map(([cardId, count]) => ({ cardId, count }));
};

export const findUserDeck = async (userId: number, deckId: number) => {
    return Deck.query()
        .where("id", deckId)
        .andWhere("userId", userId)
        .preload("cards", preloadDeckCardSet)
        .first();
};

export const syncDeckCards = async (deckId: number, entries: ApiDeckCardEntry[]) => {
    await DeckCard.query().where("deckId", deckId).delete();

    const rows = entries.flatMap(({ cardId, count }) =>
        Array.from({ length: count }, () => ({ cardId, deckId })),
    );

    if (rows.length > 0) {
        await DeckCard.createMany(rows);
    }
};

export const preloadDeckCards = async (deck: Deck) => {
    await deck.load("cards", preloadDeckCardSet);
};

export const validateCardIdsExist = async (entries: ApiDeckCardEntry[]) => {
    const cardIds = entries.map((e) => e.cardId);
    if (cardIds.length === 0) return true;

    const found = await Card.query().whereIn("id", cardIds);
    return found.length === new Set(cardIds).size;
};
