import { DEFAULT_HERO_HEALTH, type GamePlayer, type MinionState } from "#api_types/game.types";
import type Game from "#models/game";
import { getActualHeal, recordHealingDone } from "../game_stats/record_player_stats.js";
import { triggerHealPassives } from "../passive_engine/trigger_heal_passives.js";
import { applyHeal, getMinionMaxHealth } from "./apply_heal.js";

export const applyHealToHero = (
    game: Game,
    target: GamePlayer,
    healAmount: number,
    sourcePlayer: GamePlayer,
    maxHealth = DEFAULT_HERO_HEALTH,
): { gameEnded: boolean } => {
    const actualHeal = getActualHeal(target.health, healAmount, maxHealth);
    target.health = applyHeal(target.health, healAmount, maxHealth);
    recordHealingDone(sourcePlayer, actualHeal);

    if (actualHeal <= 0) return { gameEnded: false };

    return triggerHealPassives(game, { type: "HERO", affectedPlayer: target });
};

export const applyHealToMinion = (
    game: Game,
    owner: GamePlayer,
    boardIndex: number,
    minion: MinionState,
    healAmount: number,
    sourcePlayer: GamePlayer,
): { gameEnded: boolean } => {
    const maxHealth = getMinionMaxHealth(minion);
    const actualHeal = getActualHeal(minion.health, healAmount, maxHealth);
    minion.health = applyHeal(minion.health, healAmount, maxHealth);
    recordHealingDone(sourcePlayer, actualHeal);

    if (actualHeal <= 0) return { gameEnded: false };

    return triggerHealPassives(game, {
        type: "MINION",
        owner,
        boardIndex,
        minion,
    });
};
