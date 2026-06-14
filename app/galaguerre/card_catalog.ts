import type { MinionCard, MinionPowerSnapshot } from "#api_types/game.types";
import { getMinionPowerEffects } from "#api_types/get_minion_power_effects";
import type { MinionCardData } from "#galaguerre/card_definition.schema";
import { GALADRIM_CARDS } from "#database/seed_data/cards/galadrim_cards";

type GaladrimCardEntry = (typeof GALADRIM_CARDS)[number];

const isMinionCardEntry = (
    entry: GaladrimCardEntry,
): entry is GaladrimCardEntry & { data: MinionCardData } => entry.data.type === "MINION";

const normalizeMinionPowers = (
    power: MinionPowerSnapshot | null | undefined,
): MinionPowerSnapshot => ({
    hasTaunt: power?.hasTaunt ?? false,
    hasCharge: power?.hasCharge ?? false,
    hasWindfury: power?.hasWindfury ?? false,
    isPoisonous: power?.isPoisonous ?? false,
    hasStealth: power?.hasStealth ?? false,
    hasDivineShield: power?.hasDivineShield ?? false,
});

const buildMinionCardTemplate = (cardId: number, data: MinionCardData): MinionCard => {
    const minionPowers = normalizeMinionPowers(data.minionPowers);
    const effects = getMinionPowerEffects(minionPowers);

    return {
        uuid: `catalog-${cardId}`,
        cardId,
        label: data.name,
        imageUrl: data.imageUrl,
        cost: data.cost,
        tags: data.tags,
        type: "MINION",
        health: data.health,
        attack: data.attack,
        minionPowers,
        effects,
        description: `${data.attack}/${data.health}`,
        battlecryActions: data.battlecryActions,
        deathrattleActions: data.deathrattleActions,
        passives: data.passives,
    };
};

const MINION_CARD_CATALOG = new Map<number, MinionCard>(
    GALADRIM_CARDS.filter(isMinionCardEntry).map((entry) => [
        entry.id,
        buildMinionCardTemplate(entry.id, entry.data),
    ]),
);

export const getMinionCardTemplateById = (cardId: number): MinionCard | undefined =>
    MINION_CARD_CATALOG.get(cardId);
