import {
    DEFAULT_PLAYER_STATS,
    type GamePlayer,
    type GamePlayerStats,
} from "#api_types/game.types";

export const ensurePlayerStats = (player: GamePlayer): GamePlayerStats => {
    if (!player.stats) {
        player.stats = { ...DEFAULT_PLAYER_STATS };
    }
    return player.stats;
};

export const getActualDamage = (currentHealth: number, damage: number): number =>
    Math.min(damage, Math.max(currentHealth, 0));

export const getActualHeal = (
    currentHealth: number,
    healAmount: number,
    maxHealth: number,
): number => Math.max(0, Math.min(currentHealth + healAmount, maxHealth) - currentHealth);

export const recordManaSpent = (player: GamePlayer, amount: number): void => {
    ensurePlayerStats(player).manaSpent += amount;
};

export const recordMinionPlayed = (player: GamePlayer): void => {
    ensurePlayerStats(player).minionsPlayed += 1;
};

export const recordSpellCast = (player: GamePlayer): void => {
    ensurePlayerStats(player).spellsCast += 1;
};

export const recordWeaponPlayed = (player: GamePlayer): void => {
    ensurePlayerStats(player).weaponsPlayed += 1;
};

export const recordDamageDealt = (player: GamePlayer, amount: number): void => {
    if (amount <= 0) return;
    ensurePlayerStats(player).damageDealt += amount;
};

export const recordHealingDone = (player: GamePlayer, amount: number): void => {
    if (amount <= 0) return;
    ensurePlayerStats(player).healingDone += amount;
};

export const recordCardDrawn = (player: GamePlayer, count = 1): void => {
    ensurePlayerStats(player).cardsDrawn += count;
};

export const recordHeroAttack = (player: GamePlayer): void => {
    ensurePlayerStats(player).heroAttacks += 1;
};
