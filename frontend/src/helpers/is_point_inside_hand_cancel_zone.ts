export type Point = { x: number; y: number };

const isPointInsideRect = (point: Point, rect: DOMRect): boolean =>
    point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;

/**
 * Hand cancel zone for targeted-spell arrow targeting.
 * Mobile: the whole bottom chrome (hand + player bar).
 * Desktop: the player's hand element.
 */
export const isPointInsideHandCancelZone = (point: Point): boolean => {
    const mobileBottom = document.querySelector<HTMLElement>(".mobile-game-layout__bottom");
    if (mobileBottom) {
        return isPointInsideRect(point, mobileBottom.getBoundingClientRect());
    }

    const hand = document.querySelector<HTMLElement>("[data-player-hand]");
    if (!hand) return false;

    return isPointInsideRect(point, hand.getBoundingClientRect());
};
