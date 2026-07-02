import type { ApiDeckCardEntry } from "#api_types/deck.types";
import { syncDeckCards } from "#controllers/decks/deck_utils";
import { serializeDeck } from "#controllers/decks/serialize_deck";
import { validateDeckComposition } from "#galaguerre/validation/validate_deck_composition";
import Deck from "#models/deck";
import DeckShare from "#models/deck_share";
import { getUserCollectionCounts } from "#services/collection/get_user_collection_counts";
import { validateDeckOwnership } from "#services/collection/validate_deck_ownership";
import { validateSharedDeckSnapshot } from "./validate_shared_deck_snapshot.js";

export class DeckShareImportError extends Error {
    constructor(
        readonly code:
            | "SHARE_NOT_FOUND"
            | "INVALID_SHARED_DECK"
            | "MISSING_CARDS"
            | "OWNERSHIP_VALIDATION_FAILED",
        readonly details?: unknown,
    ) {
        super(code);
        this.name = "DeckShareImportError";
    }
}

const splitCardsByOwnership = (
    cards: ApiDeckCardEntry[],
    ownedCounts: Map<number, number>,
): { ownedCards: ApiDeckCardEntry[]; missingCards: ApiDeckCardEntry[] } => {
    const ownedCards: ApiDeckCardEntry[] = [];
    const missingCards: ApiDeckCardEntry[] = [];

    for (const entry of cards) {
        const owned = ownedCounts.get(entry.cardId) ?? 0;
        if (owned > 0) {
            ownedCards.push({
                cardId: entry.cardId,
                count: Math.min(entry.count, owned),
            });
        }
        if (entry.count > owned) {
            missingCards.push({
                cardId: entry.cardId,
                count: entry.count - owned,
            });
        }
    }

    return { ownedCards, missingCards };
};

export const importDeckFromShare = async (params: { userId: number; shareCode: string }) => {
    const share = await DeckShare.query().where("code", params.shareCode).preload("user").first();

    if (!share) {
        throw new DeckShareImportError("SHARE_NOT_FOUND");
    }

    const snapshotValidation = await validateSharedDeckSnapshot(share.cards);
    if (!snapshotValidation.valid) {
        throw new DeckShareImportError("INVALID_SHARED_DECK", snapshotValidation);
    }

    const composition = validateDeckComposition(share.cards, snapshotValidation.rarityByCardId);
    if (!composition.valid) {
        throw new DeckShareImportError("INVALID_SHARED_DECK", composition);
    }

    const ownedCounts = await getUserCollectionCounts(params.userId);
    const { ownedCards, missingCards } = splitCardsByOwnership(share.cards, ownedCounts);

    if (ownedCards.length === 0) {
        throw new DeckShareImportError("MISSING_CARDS", { missingCards });
    }

    const ownership = await validateDeckOwnership(params.userId, ownedCards);
    if (!ownership.valid) {
        throw new DeckShareImportError("OWNERSHIP_VALIDATION_FAILED", ownership);
    }

    const existingCount = await Deck.query().where("userId", params.userId).count("* as total");
    const isFirstDeck = Number(existingCount[0].$extras.total) === 0;
    const authorPseudo = share.user.pseudo ?? "Joueur";

    const deck = await Deck.create({
        name: `${share.name} (${authorPseudo})`,
        userId: params.userId,
        selected: isFirstDeck,
    });

    await syncDeckCards(deck.id, ownedCards);
    await deck.load("cards", (query) => query.preload("cardSet"));

    return {
        deck: serializeDeck(deck),
        missingCards,
    };
};
