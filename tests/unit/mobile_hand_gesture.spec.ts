import { test } from "@japa/runner";
import {
    MOBILE_HAND_BROWSE_FREEZE_UPWARD_PX,
    MOBILE_HAND_BROWSE_THRESHOLD_PX,
    MOBILE_HAND_LIFT_THRESHOLD_PX,
    canBrowseMobileHand,
    getMobileHandCardRatio,
    getMobileHandSpreadSpan,
    hasBrowsedMobileHand,
    hasLiftedMobileCard,
    isPointInsideMobileBounds,
    resolveMobileHandGestureIntent,
    resolveMobileHandIndex,
} from "#shared/mobile_hand_gesture";

test.group("mobile hand gesture", () => {
    test("ten cards span the hand from the first edge to the last edge", ({ assert }) => {
        const travelToCardRatio = 316 / 74;

        assert.equal(getMobileHandCardRatio(0, 10, travelToCardRatio), 0);
        assert.equal(getMobileHandCardRatio(9, 10, travelToCardRatio), 1);
        assert.closeTo(getMobileHandCardRatio(4, 10, travelToCardRatio), 4 / 9, 0.0001);
    });

    test("few cards stay centered with tight spacing", ({ assert }) => {
        const travelToCardRatio = 316 / 74;
        const ratios = [0, 1, 2, 3].map((index) =>
            getMobileHandCardRatio(index, 4, travelToCardRatio),
        );

        assert.closeTo(ratios[0], 1 - ratios[3], 0.001);
        assert.isBelow(ratios[3] - ratios[0], 1);
        assert.closeTo(getMobileHandSpreadSpan(4, travelToCardRatio), 0.69, 0.02);
    });

    test("sliding across the hand selects every card and clamps at both edges", ({ assert }) => {
        const hand = {
            handLeft: 0,
            handWidth: 390,
            cardWidth: 74,
            cardCount: 10,
        };

        assert.equal(resolveMobileHandIndex({ ...hand, clientX: -20 }), 0);
        assert.equal(resolveMobileHandIndex({ ...hand, clientX: 195 }), 5);
        assert.equal(resolveMobileHandIndex({ ...hand, clientX: 450 }), 9);
    });

    test("horizontal browsing does not play a card until the finger lifts far enough", ({
        assert,
    }) => {
        const origin = { x: 160, y: 760 };
        const browsedPoint = {
            x: origin.x + MOBILE_HAND_BROWSE_THRESHOLD_PX + 4,
            y: origin.y - 2,
        };

        assert.isTrue(hasBrowsedMobileHand(origin, browsedPoint));
        assert.isTrue(canBrowseMobileHand(origin, browsedPoint));
        assert.isFalse(hasLiftedMobileCard(origin, browsedPoint));
        assert.isFalse(
            hasLiftedMobileCard(origin, {
                x: browsedPoint.x,
                y: origin.y - MOBILE_HAND_LIFT_THRESHOLD_PX + 1,
            }),
        );
        assert.isTrue(
            hasLiftedMobileCard(origin, {
                x: browsedPoint.x,
                y: origin.y - MOBILE_HAND_LIFT_THRESHOLD_PX,
            }),
        );
    });

    test("an upward diagonal locks play without allowing browse scrubbing", ({ assert }) => {
        const origin = { x: 80, y: 760 };
        // Equal diagonal ↖: dx=18, dy=18 → PLAY, not BROWSE
        const diagonal = { x: 62, y: 742 };

        assert.equal(resolveMobileHandGestureIntent(origin, diagonal, "UNDECIDED"), "PLAY");
        assert.isFalse(canBrowseMobileHand(origin, diagonal));
        assert.equal(resolveMobileHandGestureIntent(origin, { x: 40, y: 690 }, "PLAY"), "PLAY");
    });

    test("early horizontal samples then upward freeze browsing", ({ assert }) => {
        const origin = { x: 80, y: 760 };
        const earlyHorizontal = {
            x: origin.x + MOBILE_HAND_BROWSE_THRESHOLD_PX,
            y: origin.y - 2,
        };
        const afterUpwardFreeze = {
            x: earlyHorizontal.x + 20,
            y: origin.y - MOBILE_HAND_BROWSE_FREEZE_UPWARD_PX,
        };

        assert.equal(
            resolveMobileHandGestureIntent(origin, earlyHorizontal, "UNDECIDED"),
            "BROWSE",
        );
        assert.isTrue(canBrowseMobileHand(origin, earlyHorizontal));
        assert.isFalse(canBrowseMobileHand(origin, afterUpwardFreeze));
    });

    test("a clearly horizontal gesture browses before an upward movement locks it", ({
        assert,
    }) => {
        const origin = { x: 80, y: 760 };
        const browsePoint = {
            x: origin.x + MOBILE_HAND_BROWSE_THRESHOLD_PX + 8,
            y: origin.y - 2,
        };
        const browseIntent = resolveMobileHandGestureIntent(origin, browsePoint, "UNDECIDED");

        assert.equal(browseIntent, "BROWSE");
        assert.isTrue(canBrowseMobileHand(origin, browsePoint));
        assert.equal(
            resolveMobileHandGestureIntent(origin, { x: browsePoint.x + 25, y: 748 }, browseIntent),
            "PLAY",
        );
    });

    test("micro horizontal movement stays undecided and does not browse", ({ assert }) => {
        const origin = { x: 80, y: 760 };
        const micro = { x: origin.x + 10, y: origin.y - 1 };

        assert.isFalse(hasBrowsedMobileHand(origin, micro));
        assert.isFalse(canBrowseMobileHand(origin, micro));
        assert.equal(resolveMobileHandGestureIntent(origin, micro, "UNDECIDED"), "UNDECIDED");
    });

    test("the whole player HUD and hand cancel a lifted card", ({ assert }) => {
        const playerControls = { left: 0, right: 390, top: 598, bottom: 844 };

        assert.isFalse(isPointInsideMobileBounds({ x: 195, y: 597 }, playerControls));
        assert.isTrue(isPointInsideMobileBounds({ x: 195, y: 598 }, playerControls));
        assert.isTrue(isPointInsideMobileBounds({ x: 195, y: 760 }, playerControls));
        assert.isFalse(isPointInsideMobileBounds({ x: 410, y: 760 }, playerControls));
    });
});
