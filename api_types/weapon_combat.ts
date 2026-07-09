import type { WeaponCard } from "./game.types.js";

export const getWeaponCannotAttackHero = (card: WeaponCard): boolean =>
    card.cannotAttackHero ?? false;
