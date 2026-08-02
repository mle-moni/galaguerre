/**
 * Délai artificiel entre deux actions de l'IA : sans lui, un tour entier se résoudrait en un
 * éclair côté client et le joueur ne verrait pas ce qui s'est passé.
 *
 * Partagé par les deux niveaux de difficulté, et abaissé à 0 par les tests.
 */

const DEFAULT_AI_ACTION_DELAY_MS = 800;

let actionDelayMs = DEFAULT_AI_ACTION_DELAY_MS;

export const getAiActionDelayMs = (): number => actionDelayMs;

export const setAiActionDelayForTests = (ms: number): void => {
    actionDelayMs = ms;
};

export const resetAiActionDelayForTests = (): void => {
    actionDelayMs = DEFAULT_AI_ACTION_DELAY_MS;
};
