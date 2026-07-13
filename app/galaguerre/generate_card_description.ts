import type { CardData } from "#galaguerre/card_definition.schema";
import {
    getAttackDescription,
    getBattlecryDescription,
    getDeathrattleDescription,
    getMinionCardDescription,
    getMinionPowerEffects,
    getPassiveDescription,
    getSpellCardDescription,
    getSpellEffectDescription,
    getWeaponCardDescription,
} from "#galaguerre/minion_card_metadata";

export const generateCardDescriptionFromData = (data: CardData): string => {
    switch (data.type) {
        case "WEAPON": {
            const deathrattleLines = getDeathrattleDescription(data.deathrattleActions);
            return getWeaponCardDescription(
                data.damage,
                data.durability,
                deathrattleLines,
                data.labelTags,
                data.cannotAttackHero,
            );
        }
        case "SPELL": {
            const effectLines = getSpellEffectDescription(data.spellActions);
            const castsWhenDrawn = data.castsWhenDrawn ?? false;
            return (
                getSpellCardDescription(effectLines, castsWhenDrawn, data.labelTags) || data.name
            );
        }
        case "MINION": {
            const effects = getMinionPowerEffects(data.minionPowers);
            const battlecryLines = getBattlecryDescription(data.battlecryActions);
            const deathrattleLines = getDeathrattleDescription(data.deathrattleActions);
            const attackLines = getAttackDescription(data.attackActions ?? []);
            const passiveLines = getPassiveDescription(data.passives);

            return getMinionCardDescription(
                data.attack,
                data.health,
                effects,
                battlecryLines,
                deathrattleLines,
                passiveLines,
                data.dynamicCost,
                attackLines,
            );
        }
    }
};
