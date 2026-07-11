import type { BoostSnapshot, GamePlayer, MinionState } from "#api_types/game.types";

export const revertBoostFromMinion = (minion: MinionState, boost: BoostSnapshot): void => {
    if (boost.attack !== null) {
        minion.attack -= boost.attack;
    }

    if (boost.health !== null) {
        minion.maxHealth -= boost.health;
        minion.health -= boost.health;
        if (minion.health < 1) {
            minion.health = 1;
        }
    }
};

export const revertBoostFromHero = (player: GamePlayer, boost: BoostSnapshot): void => {
    if (boost.spellPower !== null) {
        player.spellPower -= boost.spellPower;
    }
    if (boost.extraBattlecryTriggers !== null) {
        player.extraBattlecryTriggers -= boost.extraBattlecryTriggers;
    }
};
