export const XP_RANKED_VICTORY = 400;
export const XP_RANKED_DEFEAT = 100;
export const XP_TRAINING_VICTORY = 100;
export const XP_TRAINING_DEFEAT = 25;

export const MAX_LEVEL = 100;

export const LEVEL_TITLES = [
    "Étincelle",
    "Apprenti",
    "Page d'Aube",
    "Porte-Flamme",
    "Éclaireur",
    "Novice Arcanique",
    "Veilleur",
    "Scribe des Runes",
    "Disciple",
    "Initié Lumineux",
    "Lance-Étincelles",
    "Gardiennet",
    "Herboriste Lunaire",
    "Enchanteur Naissant",
    "Acolyte Solaire",
    "Porte-Rune",
    "Magelet",
    "Sentinelle d'Aurore",
    "Apprenti Thaumaturge",
    "Arcaniste",
    "Veilleur des Glyphes",
    "Invocateur Mineur",
    "Charmeur d'Étoiles",
    "Gardien du Halo",
    "Sorcier",
    "Tisseur de Sorts",
    "Lameclair",
    "Oracle Novice",
    "Runomancien",
    "Mage d'Aube",
    "Chasseur de Chimères",
    "Enlumineur",
    "Chevalier des Brumes",
    "Alchimiste Radieux",
    "Mystique",
    "Conjurateur",
    "Gardien des Portails",
    "Adepte du Cristal",
    "Émissaire Solaire",
    "Haut Arcaniste",
    "Forge-Rune",
    "Chevalier Astral",
    "Maître des Charmes",
    "Sage des Lucioles",
    "Pyromage Doré",
    "Chroniqueur d'Aether",
    "Gardien du Sanctuaire",
    "Tisseur d'Aurores",
    "Oracle de Verre",
    "Archimage",
    "Héraut de Lumière",
    "Paladin des Étoiles",
    "Maître Invocateur",
    "Thaumaturge Royal",
    "Enchanteur Suprême",
    "Stratège Arcanique",
    "Gardien du Firmament",
    "Mage-Chevalier",
    "Souverain des Glyphes",
    "Grand Sorcier",
    "Éveilleur de Dragons",
    "Maître du Halo",
    "Seigneur des Runes",
    "Oracle Céleste",
    "Archonte Lumineux",
    "Flamme-Sage",
    "Commandeur Astral",
    "Haut Gardien",
    "Tisseur de Destins",
    "Grand Archimage",
    "Champion d'Aether",
    "Seigneur de l'Aurore",
    "Mage du Zénith",
    "Gardien des Constellations",
    "Primarcaniste",
    "Héraut du Soleil",
    "Chevalier du Firmament",
    "Oracle des Mondes",
    "Maître des Arcanes",
    "Archonte Solaire",
    "Souverain d'Aether",
    "Luminarque",
    "Dragoncier",
    "Gardien de l'Équinoxe",
    "Seigneur Céleste",
    "Haut Lumomancien",
    "Mage-Étoile",
    "Prophète Radieux",
    "Roi-Sorcier",
    "Empyréen",
    "Grand Oracle",
    "Arcanarque",
    "Seigneur des Astres",
    "Primordial Lumineux",
    "Haut Empyréen",
    "Avatar d'Aurore",
    "Gardien du Soleil Premier",
    "Souverain des Cieux",
    "Légende d'Aether",
    "Galamage Suprême",
] as const;

export interface ApiUserProgression {
    xp: number;
    level: number;
    levelTitle: string;
    xpInLevel: number;
    xpToNextLevel: number | null;
}

export interface GameXpPlayerResult {
    xp: number;
}

export interface GameXpResult {
    playerOne: GameXpPlayerResult;
    playerTwo: GameXpPlayerResult;
}

export const xpRequiredToAdvanceFrom = (level: number): number => {
    if (level < 10) return 500;
    if (level < 30) return 750;
    return 1000;
};

export const getLevelTitle = (level: number): string => {
    const index = Math.min(Math.max(level, 1), MAX_LEVEL) - 1;
    return LEVEL_TITLES[index] ?? LEVEL_TITLES[MAX_LEVEL - 1];
};

export const getProgressionFromTotalXp = (totalXp: number): ApiUserProgression => {
    let level = 1;
    let remaining = Math.max(0, totalXp);

    while (level < MAX_LEVEL) {
        const required = xpRequiredToAdvanceFrom(level);
        if (remaining < required) break;
        remaining -= required;
        level += 1;
    }

    return {
        xp: totalXp,
        level,
        levelTitle: getLevelTitle(level),
        xpInLevel: remaining,
        xpToNextLevel: level < MAX_LEVEL ? xpRequiredToAdvanceFrom(level) : null,
    };
};

export const computePlayerXpGain = ({
    isWinner,
    isDraw,
    isTraining,
}: {
    isWinner: boolean;
    isDraw: boolean;
    isTraining: boolean;
}): number => {
    if (isDraw) {
        return isTraining ? XP_TRAINING_DEFEAT : XP_RANKED_DEFEAT;
    }

    if (isWinner) {
        return isTraining ? XP_TRAINING_VICTORY : XP_RANKED_VICTORY;
    }

    return isTraining ? XP_TRAINING_DEFEAT : XP_RANKED_DEFEAT;
};

export const getProgressionMilestoneLevels = (currentLevel: number, radius = 2): number[] => {
    const start = Math.max(1, currentLevel - radius);
    const end = Math.min(MAX_LEVEL, currentLevel + radius);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
};

export const getAllProgressionLevels = (): number[] =>
    Array.from({ length: MAX_LEVEL }, (_, index) => index + 1);

export const PROGRESSION_LEVELS_AHEAD = 3;

export const getProgressionVisibleLevels = (
    viewStart: number,
    ahead = PROGRESSION_LEVELS_AHEAD,
): number[] => {
    const start = Math.max(1, Math.min(viewStart, MAX_LEVEL));
    const end = Math.min(start + ahead, MAX_LEVEL);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
};

export const getDefaultProgressionViewStart = (currentLevel: number): number =>
    Math.max(1, Math.min(currentLevel, MAX_LEVEL));

export const isProgressionLevelClaimable = (level: number, currentLevel: number): boolean =>
    level >= 1 && level < currentLevel;

export interface ApiClaimProgressionLevelResponse {
    level: number;
    unopenedCount: number;
}
