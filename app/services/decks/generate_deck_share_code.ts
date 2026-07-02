import { randomBytes } from "node:crypto";

const SHARE_CODE_ALPHABET = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";

export const DECK_SHARE_CODE_LENGTH = 8;

export const generateDeckShareCode = (length = DECK_SHARE_CODE_LENGTH): string => {
    const bytes = randomBytes(length);

    return [...bytes]
        .map((byte) => SHARE_CODE_ALPHABET[byte % SHARE_CODE_ALPHABET.length])
        .join("");
};
