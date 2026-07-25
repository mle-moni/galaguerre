import type { PlayerCard, PlayerCardBase } from "#api_types/game.types";
import {
    getAttackDescription,
    getBattlecryDescription,
    getComboDescription,
    getDeathrattleDescription,
    getHeroAttackDescription,
    getMinionCardDescription,
    getMinionPowerEffects,
    normalizeMinionPowers,
    getPassiveDescription,
    getSpellCardDescription,
    getSpellEffectDescription,
    getWeaponCardDescription,
} from "../../galaguerre/minion_card_metadata.js";
import type Deck from "#models/deck";
import type Card from "#models/card";
import { randomUUID } from "node:crypto";
import { shuffleArray } from "../../utils/array.js";

type CardSource = Deck | Card[];

export type GeneratePlayerCardsOptions = {
    shuffle?: boolean;
    /** Remaining golden copies available per cardId; consumed as cards are generated. */
    goldenCounts?: Map<number, number>;
};

const getSourceCards = (source: CardSource): Card[] =>
    Array.isArray(source) ? source : source.cards;

export const generatePlayerCards = (source: CardSource, options?: GeneratePlayerCardsOptions) => {
    const remainingGolden = new Map(options?.goldenCounts ?? []);

    const cards: PlayerCard[] = getSourceCards(source).map((card) => {
        const left = remainingGolden.get(card.id) ?? 0;
        const isGolden = left > 0;
        if (isGolden) {
            remainingGolden.set(card.id, left - 1);
        }

        const base: PlayerCardBase = {
            uuid: randomUUID(),
            cardId: card.id,
            label: card.data.name,
            imageUrl: card.data.imageUrl,
            goldenVideoUrl: card.data.goldenVideoUrl ?? null,
            isGolden,
            baseCost: card.data.cost,
            cost: card.data.cost,
            dynamicCost: card.data.dynamicCost,
            tags: card.data.tags,
            labelTags: card.data.labelTags,
            rarity: card.rarity,
            isStartingDeckCard: true,
        };

        switch (card.data.type) {
            case "WEAPON": {
                const deathrattleLines = getDeathrattleDescription(card.data.deathrattleActions);
                const heroAttackLines = getHeroAttackDescription(card.data.heroAttackActions ?? []);

                return {
                    ...base,
                    type: "WEAPON",
                    damage: card.data.damage,
                    durability: card.data.durability,
                    deathrattleActions: card.data.deathrattleActions,
                    heroAttackActions: card.data.heroAttackActions ?? [],
                    cannotAttackHero: card.data.cannotAttackHero,
                    description: getWeaponCardDescription(
                        card.data.damage,
                        card.data.durability,
                        deathrattleLines,
                        card.data.labelTags,
                        card.data.cannotAttackHero,
                        heroAttackLines,
                    ),
                };
            }
            case "SPELL": {
                const effectLines = getSpellEffectDescription(card.data.spellActions);
                const castsWhenDrawn = card.data.castsWhenDrawn ?? false;

                return {
                    ...base,
                    type: "SPELL",
                    description:
                        getSpellCardDescription(effectLines, castsWhenDrawn, card.data.labelTags) ||
                        card.data.name,
                    spellActions: card.data.spellActions,
                    castsWhenDrawn,
                };
            }
            case "MINION": {
                const effects = getMinionPowerEffects(card.data.minionPowers);
                const battlecryLines = getBattlecryDescription(card.data.battlecryActions);
                const comboLines = getComboDescription(card.data.comboActions ?? []);
                const deathrattleLines = getDeathrattleDescription(card.data.deathrattleActions);
                const attackLines = getAttackDescription(card.data.attackActions ?? []);
                const passiveLines = getPassiveDescription(card.data.passives);

                return {
                    ...base,
                    type: "MINION",
                    health: card.data.health,
                    attack: card.data.attack,
                    minionPowers: normalizeMinionPowers(card.data.minionPowers),
                    effects,
                    description: getMinionCardDescription(
                        card.data.attack,
                        card.data.health,
                        effects,
                        battlecryLines,
                        deathrattleLines,
                        passiveLines,
                        card.data.dynamicCost,
                        attackLines,
                        comboLines,
                    ),
                    battlecryActions: card.data.battlecryActions,
                    comboActions: card.data.comboActions ?? [],
                    deathrattleActions: card.data.deathrattleActions,
                    attackActions: card.data.attackActions ?? [],
                    passives: card.data.passives,
                };
            }
        }
    });

    if (options?.shuffle === false) {
        return cards;
    }

    return shuffleArray(cards);
};
