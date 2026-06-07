import type { ActionTarget, MinionSpotId, SpotOwner } from "#api_types/game.types";
import { MINION_SPOT_IDS } from "#api_types/game.types";

const isMinionSpotId = (value: string): value is MinionSpotId => {
    return MINION_SPOT_IDS.includes(value as MinionSpotId);
};

const isSpotOwner = (value: string): value is SpotOwner => {
    return value === "PLAYER" || value === "OPPONENT";
};

export const resolveTargetFromPoint = (x: number, y: number): ActionTarget | null => {
    const element = document.elementFromPoint(x, y);
    if (!element) return null;

    const zone = element.closest("[data-target-zone]");
    if (!zone) return null;

    const ownerAttr = zone.getAttribute("data-spot-owner");
    if (!ownerAttr || !isSpotOwner(ownerAttr)) return null;

    const spotIdAttr = zone.getAttribute("data-spot-id");
    if (spotIdAttr === "hero" || spotIdAttr === null) {
        return { spotId: null, owner: ownerAttr };
    }

    if (!isMinionSpotId(spotIdAttr)) return null;

    return { spotId: spotIdAttr, owner: ownerAttr };
};

export const getElementCenter = (element: Element): { x: number; y: number } => {
    const rect = element.getBoundingClientRect();
    return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
    };
};

export const getMinionSpotElement = (
    spotId: MinionSpotId,
    spotOwner: SpotOwner,
): Element | null => {
    return document.querySelector(
        `[data-target-zone][data-spot-id="${spotId}"][data-spot-owner="${spotOwner}"]`,
    );
};
