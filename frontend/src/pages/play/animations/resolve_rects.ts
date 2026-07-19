import type { SpotOwner } from "#api_types/game.types";
import type { NarrativeEntityRef } from "#api_types/game_narrative.types";
import type { AnimationRect } from "~/stores/AnimationStore";
import type { GameAnimationSnapshot } from "./game_animation_snapshot.js";
import { getBoardKey, getFallbackRect, getRectCenter } from "./game_animation_snapshot.js";

export const resolveEntityRect = (
    entity: NarrativeEntityRef,
    snapshot: GameAnimationSnapshot,
): AnimationRect => {
    if (entity.type === "HERO") {
        return getFallbackRect([snapshot.heroes.get(entity.owner)]);
    }

    return getFallbackRect([snapshot.cards.get(entity.cardUuid)]);
};

export const resolveCardRect = (
    cardUuid: string,
    snapshot: GameAnimationSnapshot,
    owner: SpotOwner,
): AnimationRect =>
    getFallbackRect([
        snapshot.cards.get(cardUuid),
        snapshot.hands.get(owner),
        snapshot.heroes.get(owner),
    ]);

export const resolveBoardSlotRect = (
    owner: SpotOwner,
    boardIndex: number,
    snapshot: GameAnimationSnapshot,
): AnimationRect =>
    getFallbackRect([snapshot.spots.get(getBoardKey(owner, boardIndex)), snapshot.board]);

export const resolveHandRect = (owner: SpotOwner, snapshot: GameAnimationSnapshot): AnimationRect =>
    getFallbackRect([snapshot.hands.get(owner)]);

export const resolveDeckRect = (owner: SpotOwner, snapshot: GameAnimationSnapshot): AnimationRect =>
    getFallbackRect([snapshot.decks.get(owner)]);

export const resolveHeroRect = (owner: SpotOwner, snapshot: GameAnimationSnapshot): AnimationRect =>
    getFallbackRect([snapshot.heroes.get(owner)]);

export const resolveBoardSideRect = (
    owner: SpotOwner,
    snapshot: GameAnimationSnapshot,
): AnimationRect => getFallbackRect([snapshot.boardSides.get(owner), snapshot.board]);

export const resolveBoardCenter = (snapshot: GameAnimationSnapshot): AnimationRect =>
    getFallbackRect([snapshot.board]);

export { getRectCenter };
