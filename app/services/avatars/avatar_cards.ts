import Card from "#models/card";
import { randomIntInRange } from "../../utils/random.js";

export const TRAINING_AI_AVATAR_CARD_ID = 65;

let cachedAvatarCardIds: number[] | null = null;

const getAvatarCardIds = async (): Promise<number[]> => {
    if (cachedAvatarCardIds) {
        return cachedAvatarCardIds;
    }

    const cards = await Card.query().select("id");
    cachedAvatarCardIds = cards.map((card) => card.id);

    if (cachedAvatarCardIds.length === 0) {
        throw new Error("No cards available for avatar assignment");
    }

    return cachedAvatarCardIds;
};

export const pickRandomAvatarCardId = async (): Promise<number> => {
    const cardIds = await getAvatarCardIds();
    const index = randomIntInRange(0, cardIds.length - 1);
    return cardIds[index]!;
};

export class InvalidAvatarCardIdError extends Error {
    constructor() {
        super("Cette carte n'existe pas");
        this.name = "InvalidAvatarCardIdError";
    }
}

export const assertValidAvatarCardId = async (cardId: number): Promise<void> => {
    const card = await Card.find(cardId);

    if (!card) {
        throw new InvalidAvatarCardIdError();
    }
};
