import type { WeaponCard, WeaponState } from "#api_types/game.types";

export const instantiateWeapon = (card: WeaponCard): WeaponState => {
    return {
        uuid: card.uuid,
        weaponId: card.cardId,
        damage: card.damage,
        durability: card.durability,
        attacksThisRound: 0,
        lastActionAtRound: 0,
        originalCard: {
            ...card,
        },
    };
};
