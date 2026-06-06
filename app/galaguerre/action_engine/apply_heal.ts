import type { MinionState } from "#api_types/game.types";

export const applyHeal = (currentHealth: number, healAmount: number, maxHealth: number): number =>
    Math.min(currentHealth + healAmount, maxHealth);

export const getMinionMaxHealth = (minion: MinionState): number =>
    minion.originalCard.type === "MINION" ? minion.originalCard.health : minion.health;
