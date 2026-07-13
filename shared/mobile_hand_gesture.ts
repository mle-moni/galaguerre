export const MOBILE_HAND_LIFT_THRESHOLD_PX = 44;
export const MOBILE_HAND_BROWSE_THRESHOLD_PX = 8;

interface MobileHandPoint {
    x: number;
    y: number;
}

interface MobileHandBounds {
    left: number;
    right: number;
    top: number;
    bottom: number;
}

interface ResolveMobileHandIndexOptions {
    clientX: number;
    handLeft: number;
    handWidth: number;
    cardWidth: number;
    cardCount: number;
}

export const getMobileHandCardRatio = (index: number, cardCount: number): number => {
    if (cardCount <= 1) return 0.5;

    return Math.min(1, Math.max(0, index / (cardCount - 1)));
};

export const resolveMobileHandIndex = ({
    clientX,
    handLeft,
    handWidth,
    cardWidth,
    cardCount,
}: ResolveMobileHandIndexOptions): number => {
    if (cardCount <= 1) return 0;

    const travelWidth = Math.max(1, handWidth - cardWidth);
    const centeredX = clientX - handLeft - cardWidth / 2;
    const ratio = Math.min(1, Math.max(0, centeredX / travelWidth));

    return Math.round(ratio * (cardCount - 1));
};

export const hasBrowsedMobileHand = (origin: MobileHandPoint, current: MobileHandPoint): boolean =>
    Math.abs(current.x - origin.x) >= MOBILE_HAND_BROWSE_THRESHOLD_PX;

export const hasLiftedMobileCard = (origin: MobileHandPoint, current: MobileHandPoint): boolean =>
    origin.y - current.y >= MOBILE_HAND_LIFT_THRESHOLD_PX;

export const isPointInsideMobileBounds = (
    point: MobileHandPoint,
    bounds: MobileHandBounds,
): boolean =>
    point.x >= bounds.left &&
    point.x <= bounds.right &&
    point.y >= bounds.top &&
    point.y <= bounds.bottom;
