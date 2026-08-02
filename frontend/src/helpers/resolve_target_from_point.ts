import type { ActionTarget, SpotOwner } from "#api_types/game.types";

const isSpotOwner = (value: string): value is SpotOwner => {
    return value === "PLAYER" || value === "OPPONENT";
};

const MOBILE_TARGET_HIT_SLOP_PX = 12;

const getActionTargetFromZone = (zone: Element): ActionTarget | null => {
    const ownerAttr = zone.getAttribute("data-spot-owner");
    if (!ownerAttr || !isSpotOwner(ownerAttr)) return null;

    const minionUuidAttr = zone.getAttribute("data-minion-uuid");
    return {
        minionUuid: minionUuidAttr === "hero" || minionUuidAttr === null ? null : minionUuidAttr,
        owner: ownerAttr,
    };
};

const getDistanceFromRect = (x: number, y: number, rect: DOMRect): number => {
    const horizontalDistance = Math.max(rect.left - x, 0, x - rect.right);
    const verticalDistance = Math.max(rect.top - y, 0, y - rect.bottom);
    return Math.hypot(horizontalDistance, verticalDistance);
};

/**
 * Mobile hero bars also hold the timer / end turn column, which is not part of the
 * hero target zone. Releasing anywhere on a hero row still targets that hero.
 */
const getHeroTargetFromRow = (x: number, y: number): ActionTarget | null => {
    for (const row of document.querySelectorAll<HTMLElement>("[data-hero-row]")) {
        const owner = row.getAttribute("data-hero-row");
        if (!owner || !isSpotOwner(owner)) continue;

        const rect = row.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (getDistanceFromRect(x, y, rect) > 0) continue;

        return { minionUuid: null, owner };
    }

    return null;
};

export const resolveTargetFromPoint = (x: number, y: number): ActionTarget | null => {
    const element = document.elementFromPoint(x, y);
    const exactZone = element?.closest("[data-target-zone]");
    if (exactZone) return getActionTargetFromZone(exactZone);

    let nearestTarget: ActionTarget | null = null;
    let nearestDistance = MOBILE_TARGET_HIT_SLOP_PX + 1;

    for (const zone of document.querySelectorAll<HTMLElement>("[data-target-zone]")) {
        const rect = zone.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;

        const distance = getDistanceFromRect(x, y, rect);
        if (distance > MOBILE_TARGET_HIT_SLOP_PX || distance >= nearestDistance) continue;

        const target = getActionTargetFromZone(zone);
        if (!target) continue;

        nearestDistance = distance;
        nearestTarget = target;
    }

    return nearestTarget ?? getHeroTargetFromRow(x, y);
};

export const getElementCenter = (element: Element): { x: number; y: number } => {
    const rect = element.getBoundingClientRect();
    return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
    };
};

export const getInsertionZoneElement = (
    boardIndex: number,
    spotOwner: SpotOwner,
): Element | null => {
    return document.querySelector(
        `[data-board-insertion-zone][data-board-index="${boardIndex}"][data-spot-owner="${spotOwner}"]`,
    );
};

export const resolveBoardInsertIndexFromPoint = (
    clientX: number,
    spotOwner: SpotOwner,
): number | null => {
    const zones = document.querySelectorAll<HTMLElement>(
        `[data-board-insertion-zone][data-spot-owner="${spotOwner}"]`,
    );
    if (zones.length === 0) return null;

    for (const zone of zones) {
        const rect = zone.getBoundingClientRect();
        if (clientX >= rect.left && clientX <= rect.right) {
            const index = zone.getAttribute("data-board-index");
            return index !== null ? Number(index) : null;
        }
    }

    let bestIndex: number | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const zone of zones) {
        const rect = zone.getBoundingClientRect();
        const indexAttr = zone.getAttribute("data-board-index");
        if (indexAttr === null) continue;

        const index = Number(indexAttr);
        if (!Number.isInteger(index)) continue;

        const centerX = rect.left + rect.width / 2;
        const distance = Math.abs(clientX - centerX);

        if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = index;
        }
    }

    return bestIndex;
};

export const getMinionBoardElement = (boardIndex: number, spotOwner: SpotOwner): Element | null => {
    return document.querySelector(
        `[data-target-zone][data-board-index="${boardIndex}"][data-spot-owner="${spotOwner}"]`,
    );
};
