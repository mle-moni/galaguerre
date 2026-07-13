export const MOBILE_HAND_LIFT_THRESHOLD_PX = 44;
export const MOBILE_HAND_BROWSE_THRESHOLD_PX = 8;
export const MOBILE_HAND_DIRECTION_LOCK_THRESHOLD_PX = 12;
const MOBILE_HAND_PLAY_AXIS_RATIO = 0.5;
/** Card-edge spacing as a fraction of card width (0 = touching, negative = overlap). */
export const MOBILE_HAND_TIGHT_SPACING_RATIO = -0.04;
/** Typical travel width / card width on portrait mobile (hand padding + card sizing). */
export const MOBILE_HAND_TRAVEL_TO_CARD_RATIO = 4;

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

export type MobileHandGestureIntent = "UNDECIDED" | "BROWSE" | "PLAY";

interface ResolveMobileHandIndexOptions {
    clientX: number;
    handLeft: number;
    handWidth: number;
    cardWidth: number;
    cardCount: number;
}

export const getMobileHandSpreadSpan = (
    cardCount: number,
    travelToCardRatio: number = MOBILE_HAND_TRAVEL_TO_CARD_RATIO,
): number => {
    if (cardCount <= 1) return 0;

    return Math.min(
        1,
        ((cardCount - 1) * (1 + MOBILE_HAND_TIGHT_SPACING_RATIO)) / travelToCardRatio,
    );
};

export const getMobileHandCardRatio = (
    index: number,
    cardCount: number,
    travelToCardRatio: number = MOBILE_HAND_TRAVEL_TO_CARD_RATIO,
): number => {
    if (cardCount <= 1) return 0.5;

    const span = getMobileHandSpreadSpan(cardCount, travelToCardRatio);
    const start = (1 - span) / 2;
    const step = span / (cardCount - 1);

    return start + index * step;
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
    const travelToCardRatio = travelWidth / cardWidth;
    const span = getMobileHandSpreadSpan(cardCount, travelToCardRatio);
    const start = (1 - span) / 2;
    const step = span / (cardCount - 1);
    const centeredX = clientX - handLeft - cardWidth / 2;
    const ratio = centeredX / travelWidth;

    return Math.min(cardCount - 1, Math.max(0, Math.round((ratio - start) / step)));
};

export const hasBrowsedMobileHand = (origin: MobileHandPoint, current: MobileHandPoint): boolean =>
    Math.abs(current.x - origin.x) >= MOBILE_HAND_BROWSE_THRESHOLD_PX;

export const hasLiftedMobileCard = (origin: MobileHandPoint, current: MobileHandPoint): boolean =>
    origin.y - current.y >= MOBILE_HAND_LIFT_THRESHOLD_PX;

export const resolveMobileHandGestureIntent = (
    origin: MobileHandPoint,
    current: MobileHandPoint,
    currentIntent: MobileHandGestureIntent,
): MobileHandGestureIntent => {
    if (currentIntent === "PLAY") return "PLAY";

    const horizontalDistance = Math.abs(current.x - origin.x);
    const upwardDistance = Math.max(0, origin.y - current.y);

    if (
        upwardDistance >= MOBILE_HAND_DIRECTION_LOCK_THRESHOLD_PX &&
        (currentIntent === "BROWSE" ||
            upwardDistance >= horizontalDistance * MOBILE_HAND_PLAY_AXIS_RATIO)
    ) {
        return "PLAY";
    }

    if (
        currentIntent === "BROWSE" ||
        (horizontalDistance >= MOBILE_HAND_BROWSE_THRESHOLD_PX &&
            upwardDistance < horizontalDistance * MOBILE_HAND_PLAY_AXIS_RATIO)
    ) {
        return "BROWSE";
    }

    return "UNDECIDED";
};

export const isPointInsideMobileBounds = (
    point: MobileHandPoint,
    bounds: MobileHandBounds,
): boolean =>
    point.x >= bounds.left &&
    point.x <= bounds.right &&
    point.y >= bounds.top &&
    point.y <= bounds.bottom;
