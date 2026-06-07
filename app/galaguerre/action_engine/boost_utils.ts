import type { BoostSnapshot } from "#api_types/game.types";
import type Boost from "#models/boost";

export const serializeBoost = (boost: Boost | null | undefined): BoostSnapshot | null => {
    if (!boost) return null;

    const power = boost.minionPower;

    return {
        attack: boost.attack,
        health: boost.health,
        spellPower: boost.spellPower,
        minionPower: power
            ? {
                  hasTaunt: power.hasTaunt,
                  hasCharge: power.hasCharge,
                  hasWindfury: power.hasWindfury,
                  isPoisonous: power.isPoisonous,
              }
            : null,
    };
};

export const hasBoostEffect = (boost: BoostSnapshot): boolean => {
    return (
        boost.attack !== null ||
        boost.health !== null ||
        boost.spellPower !== null ||
        boost.minionPower !== null
    );
};

export const boostHasMinionStats = (boost: BoostSnapshot): boolean => {
    return boost.attack !== null || boost.health !== null || boost.minionPower !== null;
};

export const boostHasSpellPower = (boost: BoostSnapshot): boolean => {
    return boost.spellPower !== null;
};

export const modelBoostHasEffect = (boost: Boost): boolean => {
    return (
        boost.attack !== null ||
        boost.health !== null ||
        boost.spellPower !== null ||
        boost.minionPowerId !== null
    );
};

export const modelBoostHasMinionStats = (boost: Boost): boolean => {
    return boost.attack !== null || boost.health !== null || boost.minionPowerId !== null;
};

export const modelBoostHasSpellPower = (boost: Boost): boolean => {
    return boost.spellPower !== null;
};
