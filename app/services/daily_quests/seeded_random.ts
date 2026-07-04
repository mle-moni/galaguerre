import { createHash } from "node:crypto";

export const createSeededRandom = (seed: string): (() => number) => {
    let hash = createHash("sha256").update(seed).digest();
    let index = 0;

    return () => {
        if (index >= hash.length - 4) {
            hash = createHash("sha256").update(hash).digest();
            index = 0;
        }

        const value = hash.readUInt32BE(index);
        index += 4;
        return value / 0xffffffff;
    };
};

export const pickRandomItem = <T>(items: T[], random: () => number): T => {
    const index = Math.floor(random() * items.length);
    return items[index]!;
};

export const shuffleWithSeed = <T>(items: T[], random: () => number): T[] => {
    const copy = [...items];

    for (let index = copy.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(random() * (index + 1));
        [copy[index], copy[swapIndex]] = [copy[swapIndex]!, copy[index]!];
    }

    return copy;
};
