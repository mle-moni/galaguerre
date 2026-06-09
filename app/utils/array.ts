import { randomIntInRange } from "./random.js";

// Fisher-Yates shuffle using crypto.randomInt; O(n), does not mutate the input array
export const shuffleArray = <T>(array: T[]): T[] => {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = randomIntInRange(0, i);
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
};
