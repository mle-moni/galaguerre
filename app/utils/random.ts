import { randomInt, randomUUID } from "node:crypto";
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

/** Blocs de 16 bits composant un UUID : 8 × 4 chiffres hexadécimaux = 128 bits. */
const UUID_BLOCKS = 8;

/**
 * UUID d'entité de jeu (carte en main, monstre invoqué...), stable sous simulation.
 *
 * `randomUUID` échappe au PRNG seedé. Ce serait sans conséquence si ces UUID n'étaient que des
 * identifiants — mais la recherche de l'IA dérive la graine de chaque BRANCHE en hachant la
 * séquence de coups qui y mène (`deriveSeed`), et un coup s'identifie par l'UUID de la carte ou du
 * monstre concerné. Un UUID différent donne donc une graine de branche différente, donc une
 * résolution différente de tout effet aléatoire pendant la recherche, donc un autre coup choisi.
 *
 * Conséquence mesurée avant correction : deux exécutions du banc d'essai sur la même graine
 * jouaient des parties différentes, ce qui retire tout sens à la comparaison de deux variantes
 * d'IA — l'écart de winrate mesurait le hasard des UUID autant que la politique testée.
 *
 * Hors simulation (vraies parties), on rend un vrai `randomUUID` : la production est inchangée.
 *
 * Deux UUID simulés ne peuvent entrer en collision que si le PRNG repasse par le même état, ce
 * qu'un flux ne fait jamais sur la durée d'une partie. Entre flux distincts (deux branches de
 * recherche), la collision est possible mais reste sous 10⁻⁵ par partie et ne peut salir qu'une
 * ligne simulée, jamais un vrai état de jeu.
 */
export const gameEntityUuid = (): string => {
    const simulationRng = getSimulationRng();
    if (!simulationRng) return randomUUID();

    let hex = "";
    for (let block = 0; block < UUID_BLOCKS; block++) {
        hex += simulationRng(0, 0xffff).toString(16).padStart(4, "0");
    }

    return [
        hex.slice(0, 8),
        hex.slice(8, 12),
        hex.slice(12, 16),
        hex.slice(16, 20),
        hex.slice(20),
    ].join("-");
};
