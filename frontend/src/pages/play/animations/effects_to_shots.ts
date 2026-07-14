import type { ApiGame, GameData, PlayerCard } from "#api_types/game.types";
import type { NarrativeEffect } from "#api_types/game_narrative.types";
import type { GameAnimationSnapshot } from "./game_animation_snapshot.js";
import {
    resolveBoardCenter,
    resolveBoardSlotRect,
    resolveCardRect,
    resolveDeckRect,
    resolveEntityRect,
    resolveHandRect,
    resolveHeroRect,
} from "./resolve_rects.js";
import type {
    AnimationRect,
    FloatingTone,
    VisualAnimationEventInput,
} from "~/stores/AnimationStore";

const floatingTextTargetKey = (at: AnimationRect) => `${at.x},${at.y},${at.width},${at.height}`;

const findCardInGame = (gameData: GameData, cardUuid: string): PlayerCard | undefined => {
    for (const player of [gameData.playerOne, gameData.playerTwo]) {
        const fromHand = player.hand.find((card) => card.uuid === cardUuid);
        if (fromHand) return fromHand;

        for (const minion of player.board) {
            if (minion.uuid === cardUuid) return minion.originalCard;
            if (minion.originalCard.uuid === cardUuid) return minion.originalCard;
        }

        if (player.weaponState?.originalCard.uuid === cardUuid) {
            return player.weaponState.originalCard;
        }
    }

    return undefined;
};

const getDummyCard = (cardUuid: string): PlayerCard => ({
    type: "MINION",
    uuid: cardUuid,
    cardId: 0,
    label: "Carte",
    imageUrl: "https://picsum.photos/seed/dummy_card/200/300",
    baseCost: 0,
    cost: 0,
    dynamicCost: null,
    tags: [],
    labelTags: [],
    rarity: "COMMON",
    attack: 0,
    health: 0,
    minionPowers: {},
    effects: [],
    description: "",
    battlecryActions: [],
    comboActions: [],
    deathrattleActions: [],
    attackActions: [],
    passives: [],
});

const resolveDestinationRect = (
    effect: Extract<NarrativeEffect, { type: "MOVE_CARD" }>,
    snapshot: GameAnimationSnapshot,
) => {
    if (effect.to.type === "BOARD") {
        return resolveBoardSlotRect(effect.to.owner, effect.to.boardIndex, snapshot);
    }

    if (effect.to.type === "HERO_WEAPON") {
        return resolveHeroRect(effect.to.owner, snapshot);
    }

    return resolveBoardCenter(snapshot);
};

export const effectsToShots = (
    effects: NarrativeEffect[],
    snapshot: GameAnimationSnapshot,
    displayGame: ApiGame,
    _userId: number,
): VisualAnimationEventInput[] => {
    const shots: VisualAnimationEventInput[] = [];
    const gameData = displayGame.data;
    const floatingTextStacks = new Map<string, number>();

    const pushFloatingText = (at: AnimationRect, label: string, tone: FloatingTone) => {
        const targetKey = floatingTextTargetKey(at);
        const stackIndex = floatingTextStacks.get(targetKey) ?? 0;
        floatingTextStacks.set(targetKey, stackIndex + 1);
        shots.push({ type: "FLOATING_TEXT", at, label, tone, stackIndex });
    };

    for (const effect of effects) {
        switch (effect.type) {
            case "MOVE_CARD": {
                const card =
                    findCardInGame(gameData, effect.cardUuid) ?? getDummyCard(effect.cardUuid);
                const from =
                    effect.from === "DECK"
                        ? resolveDeckRect(effect.owner, snapshot)
                        : resolveHandRect(effect.owner, snapshot);
                const to = resolveDestinationRect(effect, snapshot);
                shots.push({ type: "CARD_FLIGHT", card, from, to });
                break;
            }
            case "SPEND_MANA": {
                const hero = resolveHeroRect(effect.owner, snapshot);
                pushFloatingText(hero, `-${effect.amount}`, "mana");
                break;
            }
            case "GAIN_MANA": {
                const hero = resolveHeroRect(effect.owner, snapshot);
                pushFloatingText(hero, `+${effect.amount}`, "mana");
                break;
            }
            case "ATTACK_LUNGE": {
                const card =
                    findCardInGame(gameData, effect.attackerCardUuid) ??
                    getDummyCard(effect.attackerCardUuid);
                const from = resolveCardRect(
                    effect.attackerCardUuid,
                    snapshot,
                    effect.attackerOwner,
                );
                const to = resolveEntityRect(effect.target, snapshot);
                shots.push({ type: "ATTACK", card, from, to });
                break;
            }
            case "COMBAT_DAMAGE":
            case "STAT_CHANGE": {
                const at = resolveEntityRect(effect.target, snapshot);
                const healthDelta =
                    effect.type === "COMBAT_DAMAGE" ? -effect.amount : effect.healthDelta;
                const attackDelta = effect.type === "STAT_CHANGE" ? effect.attackDelta : undefined;

                if (healthDelta !== undefined && healthDelta !== 0) {
                    pushFloatingText(
                        at,
                        healthDelta > 0 ? `+${healthDelta}` : `${healthDelta}`,
                        healthDelta < 0 ? "damage" : "heal",
                    );
                }

                if (attackDelta !== undefined && attackDelta !== 0) {
                    const maxHealthDelta =
                        effect.type === "STAT_CHANGE" ? effect.healthDelta : undefined;
                    const boostLabel =
                        maxHealthDelta !== undefined && maxHealthDelta !== 0
                            ? `${attackDelta > 0 ? `+${attackDelta}` : attackDelta}/${maxHealthDelta > 0 ? `+${maxHealthDelta}` : maxHealthDelta}`
                            : attackDelta > 0
                              ? `+${attackDelta}`
                              : `${attackDelta}`;
                    pushFloatingText(at, boostLabel, "boost");
                }
                break;
            }
            case "TRIGGER": {
                const at = resolveCardRect(effect.cardUuid, snapshot, effect.owner);
                shots.push({ type: "SOURCE_PULSE", at, trigger: effect.trigger });
                break;
            }
            case "KILL": {
                const at = resolveCardRect(effect.cardUuid, snapshot, effect.owner);
                shots.push({ type: "DEATH", at });
                break;
            }
            case "DRAW": {
                const from = resolveDeckRect(effect.owner, snapshot);
                const to = effect.cardUuid
                    ? resolveCardRect(effect.cardUuid, snapshot, effect.owner)
                    : resolveHandRect(effect.owner, snapshot);
                shots.push({ type: "DRAW", from, to });
                break;
            }
            case "FATIGUE": {
                const hero = resolveHeroRect(effect.owner, snapshot);
                pushFloatingText(hero, `-${effect.amount}`, "damage");
                break;
            }
            case "OVERDRAW": {
                const from =
                    effect.source === "DECK"
                        ? resolveDeckRect(effect.owner, snapshot)
                        : resolveHeroRect(effect.owner, snapshot);
                const to = resolveBoardCenter(snapshot);
                shots.push({ type: "CARD_FLIGHT", card: effect.card, from, to });
                shots.push({ type: "DEATH", at: to });
                break;
            }
            case "TURN_BANNER": {
                shots.push({
                    type: "TURN_BANNER",
                    owner: effect.owner,
                    label: effect.label,
                    at: resolveBoardCenter(snapshot),
                });
                break;
            }
            case "SUMMON": {
                const card =
                    findCardInGame(gameData, effect.cardUuid) ?? getDummyCard(effect.cardUuid);
                const from = resolveHeroRect(effect.owner, snapshot);
                const to = resolveBoardSlotRect(effect.owner, effect.boardIndex, snapshot);
                shots.push({ type: "CARD_FLIGHT", card, from, to });
                break;
            }
            case "RETURN_TO_HAND": {
                const from = resolveBoardSlotRect(effect.owner, effect.fromBoardIndex, snapshot);
                const to = resolveHandRect(effect.owner, snapshot);
                shots.push({ type: "CARD_FLIGHT", card: effect.card, from, to });
                break;
            }
            case "BREAK_WEAPON": {
                const at = resolveHeroRect(effect.owner, snapshot);
                shots.push({ type: "DEATH", at });
                break;
            }
            default:
                break;
        }
    }

    return shots;
};
