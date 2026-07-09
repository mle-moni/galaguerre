import type { MinionCard, PlayerCard, SpellCard, WeaponCard } from "./game.types.js";
import { getMinionPowerEffects } from "./get_minion_power_effects.js";
import {
    getBattlecryDescription,
    getDeathrattleDescription,
    getMinionCardDescription,
    getPassiveDescription,
    getSpellCardDescription,
    getSpellEffectDescription,
    getWeaponCardDescription,
} from "./minion_card_description.js";
import { GALADRIM_CARDS } from "#database/seed_data/cards/galadrim_cards";
import type { CardSeedEntry } from "#database/seed_data/cards/define_card";

const normalizeMinionPowers = (power: MinionCard["minionPowers"] | null | undefined) => ({
    hasTaunt: power?.hasTaunt ?? false,
    hasCharge: power?.hasCharge ?? false,
    hasWindfury: power?.hasWindfury ?? false,
    isPoisonous: power?.isPoisonous ?? false,
    hasStealth: power?.hasStealth ?? false,
    hasDivineShield: power?.hasDivineShield ?? false,
});

const buildCardPreview = (entry: CardSeedEntry): PlayerCard => {
    switch (entry.data.type) {
        case "MINION":
            return buildMinionPreview(entry);
        case "SPELL":
            return buildSpellPreview(entry);
        case "WEAPON":
            return buildWeaponPreview(entry);
    }
};

const buildMinionPreview = (entry: CardSeedEntry): MinionCard => {
    const { id, data } = entry;
    if (data.type !== "MINION") {
        throw new Error(`Expected minion card ${id}`);
    }

    const minionPowers = normalizeMinionPowers(data.minionPowers);
    const effects = getMinionPowerEffects(minionPowers);
    const battlecryLines = getBattlecryDescription(data.battlecryActions);
    const deathrattleLines = getDeathrattleDescription(data.deathrattleActions);
    const passiveLines = getPassiveDescription(data.passives);

    return {
        uuid: `preview-${id}`,
        cardId: id,
        label: data.name,
        imageUrl: data.imageUrl,
        baseCost: data.cost,
        cost: data.cost,
        dynamicCost: data.dynamicCost,
        tags: data.tags,
        labelTags: data.labelTags,
        rarity: entry.rarity ?? "COMMON",
        type: "MINION",
        health: data.health,
        attack: data.attack,
        minionPowers,
        effects,
        description: getMinionCardDescription(
            data.attack,
            data.health,
            effects,
            battlecryLines,
            deathrattleLines,
            passiveLines,
            data.dynamicCost,
        ),
        battlecryActions: data.battlecryActions,
        deathrattleActions: data.deathrattleActions,
        passives: data.passives,
    };
};

const buildSpellPreview = (entry: CardSeedEntry): SpellCard => {
    const { id, data } = entry;
    if (data.type !== "SPELL") {
        throw new Error(`Expected spell card ${id}`);
    }

    const effectLines = getSpellEffectDescription(data.spellActions);
    const castsWhenDrawn = data.castsWhenDrawn ?? false;

    return {
        uuid: `preview-${id}`,
        cardId: id,
        label: data.name,
        imageUrl: data.imageUrl,
        baseCost: data.cost,
        cost: data.cost,
        dynamicCost: data.dynamicCost,
        tags: data.tags,
        labelTags: data.labelTags,
        rarity: entry.rarity ?? "COMMON",
        type: "SPELL",
        description:
            getSpellCardDescription(effectLines, castsWhenDrawn, data.labelTags) || data.name,
        spellActions: data.spellActions,
        castsWhenDrawn,
    };
};

const buildWeaponPreview = (entry: CardSeedEntry): WeaponCard => {
    const { id, data } = entry;
    if (data.type !== "WEAPON") {
        throw new Error(`Expected weapon card ${id}`);
    }

    const deathrattleLines = getDeathrattleDescription(data.deathrattleActions);

    return {
        uuid: `preview-${id}`,
        cardId: id,
        label: data.name,
        imageUrl: data.imageUrl,
        baseCost: data.cost,
        cost: data.cost,
        dynamicCost: data.dynamicCost,
        tags: data.tags,
        labelTags: data.labelTags,
        rarity: entry.rarity ?? "COMMON",
        type: "WEAPON",
        damage: data.damage,
        durability: data.durability,
        description: getWeaponCardDescription(
            data.damage,
            data.durability,
            deathrattleLines,
            data.labelTags,
            data.cannotAttackHero,
        ),
        deathrattleActions: data.deathrattleActions,
        cannotAttackHero: data.cannotAttackHero,
    };
};

const CARD_PREVIEW_BY_ID = new Map<number, PlayerCard>(
    GALADRIM_CARDS.map((entry) => [entry.id, buildCardPreview(entry)]),
);

export const getCardPreviewById = (cardId: number): PlayerCard | undefined =>
    CARD_PREVIEW_BY_ID.get(cardId);

export const getMinionCardTemplateById = (cardId: number): MinionCard | undefined => {
    const card = CARD_PREVIEW_BY_ID.get(cardId);
    return card?.type === "MINION" ? card : undefined;
};

export const getAllMinionCardTemplates = (): MinionCard[] =>
    Array.from(CARD_PREVIEW_BY_ID.values()).filter(
        (card): card is MinionCard => card.type === "MINION",
    );

const CARD_IS_COLLECTIBLE_BY_ID = new Map<number, boolean>(
    GALADRIM_CARDS.map((entry) => [entry.id, entry.isCollectible ?? true]),
);

export const isCardCollectible = (cardId: number): boolean =>
    CARD_IS_COLLECTIBLE_BY_ID.get(cardId) ?? true;

export const isMinionCardCollectible = (cardId: number): boolean => isCardCollectible(cardId);

export const getAllCardTemplates = (): PlayerCard[] => Array.from(CARD_PREVIEW_BY_ID.values());

export const getCollectibleCardTemplates = (): PlayerCard[] =>
    getAllCardTemplates().filter((template) => isCardCollectible(template.cardId));

export const getCollectibleMinionCardTemplates = (): MinionCard[] =>
    getAllMinionCardTemplates().filter((template) => isMinionCardCollectible(template.cardId));
