// inneficient, O(N log N) but it's easy to understand an won't be used on very large arrays
export const shuffleArray = <T>(array: T[]): T[] => {
    return array
        .map((value) => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value);
};
