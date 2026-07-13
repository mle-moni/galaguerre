import Card from "#models/card";
import { randomIntInRange } from "../../utils/random.js";

export const TRAINING_AI_AVATAR_CARD_ID = 65;

export const pickRandomAvatarCardId = async (): Promise<number> => {
    const cards = await Card.query().select("id");

    if (cards.length === 0) {
        throw new Error("No cards available for avatar assignment");
    }

    const index = randomIntInRange(0, cards.length - 1);
    return cards[index]!.id;
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
