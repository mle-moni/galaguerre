import { randomInt } from "node:crypto";
import { getSimulationRng } from "./simulation_context.js";

type RandomIntInRangeFn = (min: number, max: number) => number;

let randomIntInRangeOverride: RandomIntInRangeFn | null = null;

export const setRandomIntInRangeOverride = (override: RandomIntInRangeFn | null): void => {
    randomIntInRangeOverride = override;
};

export const resetRandomIntInRangeOverride = (): void => {
    randomIntInRangeOverride = null;
};

const cryptoRandomIntInRange = (min: number, max: number): number => randomInt(min, max + 1);

export const randomIntInRange = (min: number, max: number): number => {
    const simulationRng = getSimulationRng();
    if (simulationRng) return simulationRng(min, max);

    return randomIntInRangeOverride
        ? randomIntInRangeOverride(min, max)
        : cryptoRandomIntInRange(min, max);
};

export const randomBoolean = (): boolean => randomIntInRange(0, 1) === 0;
