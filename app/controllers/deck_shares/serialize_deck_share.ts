import type { ApiDeckShare } from "#api_types/deck_share.types";
import type DeckShare from "#models/deck_share";
import { validateSharedDeckSnapshot } from "#services/decks/validate_shared_deck_snapshot";
import { validateDeckComposition } from "#galaguerre/validation/validate_deck_composition";

export const serializeDeckShare = async (share: DeckShare): Promise<ApiDeckShare> => {
    const snapshotValidation = await validateSharedDeckSnapshot(share.cards);
    const composition = validateDeckComposition(share.cards, snapshotValidation.rarityByCardId);

    return {
        code: share.code,
        name: share.name,
        authorUserId: share.userId,
        authorPseudo: share.user?.pseudo ?? "Joueur",
        cards: share.cards,
        cardCount: composition.cardCount,
        valid: snapshotValidation.valid,
        compositionErrors: snapshotValidation.compositionErrors,
        createdAt: share.createdAt.toISO()!,
    };
};
