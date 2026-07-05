import { DAILY_TIMEZONE } from "#api_types/rewards.types";
import type UserDailyQuest from "#models/user_daily_quest";
import { DateTime } from "luxon";

export const getSecondsUntilParisMidnight = (): number => {
    const now = DateTime.now().setZone(DAILY_TIMEZONE);
    const midnight = now.plus({ days: 1 }).startOf("day");
    return Math.max(0, Math.floor(midnight.diff(now, "seconds").seconds));
};

export const getDailyQuestTitle = (quest: UserDailyQuest): string => {
    const cardName = quest.params?.cardName;

    switch (quest.questType) {
        case "WIN_GAME":
            return "Gagner une partie";
        case "WIN_GAMES":
            return `Gagner ${quest.targetValue} parties`;
        case "WIN_WITH_CARD":
            return cardName
                ? `Gagner une partie en ayant joué ${cardName}`
                : "Gagner une partie en ayant joué une carte spécifique";
        case "OPEN_PACK":
            return quest.targetValue === 1
                ? "Ouvrir 1 paquet"
                : `Ouvrir ${quest.targetValue} paquets`;
        case "PLAY_MINIONS":
            return `Poser ${quest.targetValue} monstres`;
        case "DEAL_DAMAGE":
            return `Infliger ${quest.targetValue} dégâts`;
        case "DRAW_CARDS":
            return `Piocher ${quest.targetValue} cartes`;
        case "HEAL_HP":
            return `Soigner ${quest.targetValue} PDV`;
        case "CAST_SPELLS":
            return `Lancer ${quest.targetValue} sorts`;
        case "HERO_ATTACKS":
            return `Attaquer ${quest.targetValue} fois avec le héros`;
        case "SPEND_MANA":
            return `Dépenser ${quest.targetValue} mana`;
        default:
            return "Quête journalière";
    }
};
