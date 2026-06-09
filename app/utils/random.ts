import { randomInt } from "node:crypto";

export const randomBoolean = (): boolean => randomInt(2) === 0;

export const randomIntInRange = (min: number, max: number): number => randomInt(min, max + 1);
