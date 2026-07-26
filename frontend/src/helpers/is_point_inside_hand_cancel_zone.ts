export type Point = { x: number; y: number };

const isPointInsideRect = (point: Point, rect: DOMRect): boolean =>
    point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;

/**
 * Hand cancel zone for targeted-spell arrow targeting.
 * Uses the player's hand element on both mobile and desktop.
 */
export const isPointInsideHandCancelZone = (point: Point): boolean => {
    const hand = document.querySelector<HTMLElement>("[data-player-hand]");
    if (!hand) return false;

    return isPointInsideRect(point, hand.getBoundingClientRect());
};
