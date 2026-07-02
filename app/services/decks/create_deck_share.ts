import { deckCardsToEntries, findUserDeck } from "#controllers/decks/deck_utils";
import DeckShare from "#models/deck_share";
import { DECK_SHARE_CODE_LENGTH, generateDeckShareCode } from "./generate_deck_share_code.js";

const MAX_CODE_GENERATION_ATTEMPTS = 10;

export const createDeckShare = async (params: {
    userId: number;
    deckId: number;
}): Promise<DeckShare> => {
    const deck = await findUserDeck(params.userId, params.deckId);

    if (!deck) {
        throw new Error("DECK_NOT_FOUND");
    }

    const cards = deckCardsToEntries(deck);

    for (let attempt = 0; attempt < MAX_CODE_GENERATION_ATTEMPTS; attempt++) {
        const code = generateDeckShareCode(DECK_SHARE_CODE_LENGTH);
        const existing = await DeckShare.findBy("code", code);

        if (existing) {
            continue;
        }

        return DeckShare.create({
            code,
            userId: params.userId,
            deckId: deck.id,
            name: deck.name,
            cards,
        });
    }

    throw new Error("DECK_SHARE_CODE_GENERATION_FAILED");
};
