import type { ApiDeckCardEntry } from "#api_types/deck.types";
import type { CardRarity } from "#api_types/card_rarity.types";
import Card from "#models/card";
import Deck from "#models/deck";
import DeckCard from "#models/deck_card";
import type { ManyToManyQueryBuilderContract } from "@adonisjs/lucid/types/relations";
import { validateDeckEntriesCollectible } from "../../galaguerre/validation/validate_deck_collectible.js";

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

export const validateDeckCardEntries = async (entries: ApiDeckCardEntry[]) => {
    const cardIds = [...new Set(entries.map((entry) => entry.cardId))];
    if (cardIds.length === 0) {
        return { valid: true, errors: [], rarityByCardId: new Map<number, CardRarity>() };
    }

    const found = await Card.query().whereIn("id", cardIds);
    const cardsById = new Map(found.map((card) => [card.id, card]));
    const collectibleValidation = validateDeckEntriesCollectible(entries, cardsById);
    const rarityByCardId = new Map(found.map((card) => [card.id, card.rarity]));

    return {
        ...collectibleValidation,
        rarityByCardId,
    };
};
