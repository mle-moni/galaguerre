import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Contexte de simulation de l'IA avancée.
 *
 * L'IA avancée explore ses coups en rejouant les VRAIES fonctions du moteur de jeu sur une copie
 * de `GameData`. Ces fonctions déclenchent normalement des effets de bord (écriture en base via
 * `terminateGame`, émission de sockets, timers, planification du tour de l'IA, replay...) qui
 * n'ont aucun sens — et sont dangereux — sur un état simulé.
 *
 * Plutôt que d'écraser des globales (ce que font les helpers de test), on propage un contexte via
 * `AsyncLocalStorage` : c'est concurrent-safe, une simulation ne peut donc pas neutraliser les
 * effets de bord d'une vraie partie qui tournerait en parallèle.
 */
export interface SimulationContext {
    /** PRNG déterministe utilisé à la place de `randomIntInRange` pendant la simulation. */
    rng: (min: number, max: number) => number;
}

const simulationStorage = new AsyncLocalStorage<SimulationContext>();

export const runInSimulation = <T>(context: SimulationContext, fn: () => Promise<T>): Promise<T> =>
    simulationStorage.run(context, fn);

export const isSimulating = (): boolean => simulationStorage.getStore() !== undefined;

export const getSimulationRng = (): SimulationContext["rng"] | null =>
    simulationStorage.getStore()?.rng ?? null;

/**
 * PRNG déterministe (mulberry32) : deux branches de recherche partant de la même graine voient
 * exactement le même aléatoire, ce qui rend leurs scores comparables.
 */
export const createSeededRng = (seed: number): SimulationContext["rng"] => {
    let state = seed >>> 0;

    const nextFloat = (): number => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    return (min: number, max: number): number => {
        if (max <= min) return min;
        return min + Math.floor(nextFloat() * (max - min + 1));
    };
};
