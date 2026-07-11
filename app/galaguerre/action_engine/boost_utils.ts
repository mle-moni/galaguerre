import type { BoostSnapshot } from "#api_types/game.types";

export const boostHasEffect = (boost: BoostSnapshot): boolean => {
    return (
        boost.attack !== null ||
        boost.health !== null ||
        boost.spellPower !== null ||
        boost.extraBattlecryTriggers !== null ||
        boost.minionPowers !== null
    );
};

export const hasBoostEffect = boostHasEffect;

export const boostHasMinionStats = (boost: BoostSnapshot): boolean => {
    return boost.attack !== null || boost.health !== null || boost.minionPowers !== null;
};

export const boostHasSpellPower = (boost: BoostSnapshot): boolean => {
    return boost.spellPower !== null;
};

export const boostHasExtraBattlecryTriggers = (boost: BoostSnapshot): boolean => {
    return boost.extraBattlecryTriggers !== null;
};
