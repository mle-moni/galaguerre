import { randomInt } from "node:crypto";

type RandomIntInRangeFn = (min: number, max: number) => number;

let randomIntInRangeOverride: RandomIntInRangeFn | null = null;

export const setRandomIntInRangeOverride = (override: RandomIntInRangeFn | null): void => {
    randomIntInRangeOverride = override;
};

export const resetRandomIntInRangeOverride = (): void => {
    randomIntInRangeOverride = null;
};

const cryptoRandomIntInRange = (min: number, max: number): number => randomInt(min, max + 1);

export const randomIntInRange = (min: number, max: number): number =>
    randomIntInRangeOverride
        ? randomIntInRangeOverride(min, max)
        : cryptoRandomIntInRange(min, max);

export const randomBoolean = (): boolean => randomIntInRange(0, 1) === 0;
