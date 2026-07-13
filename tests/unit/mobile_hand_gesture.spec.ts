import { test } from "@japa/runner";
import {
    MOBILE_HAND_LIFT_THRESHOLD_PX,
    getMobileHandCardRatio,
    hasBrowsedMobileHand,
    hasLiftedMobileCard,
    isPointInsideMobileBounds,
    resolveMobileHandIndex,
} from "#shared/mobile_hand_gesture";

test.group("mobile hand gesture", () => {
    test("ten cards span the hand from the first edge to the last edge", ({ assert }) => {
        assert.equal(getMobileHandCardRatio(0, 10), 0);
        assert.equal(getMobileHandCardRatio(9, 10), 1);
        assert.closeTo(getMobileHandCardRatio(4, 10), 4 / 9, 0.0001);
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

        assert.isTrue(hasBrowsedMobileHand(origin, { x: 200, y: 756 }));
        assert.isFalse(hasLiftedMobileCard(origin, { x: 200, y: 756 }));
        assert.isFalse(
            hasLiftedMobileCard(origin, {
                x: 200,
                y: origin.y - MOBILE_HAND_LIFT_THRESHOLD_PX + 1,
            }),
        );
        assert.isTrue(
            hasLiftedMobileCard(origin, {
                x: 200,
                y: origin.y - MOBILE_HAND_LIFT_THRESHOLD_PX,
            }),
        );
    });

    test("the whole player HUD and hand cancel a lifted card", ({ assert }) => {
        const playerControls = { left: 0, right: 390, top: 598, bottom: 844 };

        assert.isFalse(isPointInsideMobileBounds({ x: 195, y: 597 }, playerControls));
        assert.isTrue(isPointInsideMobileBounds({ x: 195, y: 598 }, playerControls));
        assert.isTrue(isPointInsideMobileBounds({ x: 195, y: 760 }, playerControls));
        assert.isFalse(isPointInsideMobileBounds({ x: 410, y: 760 }, playerControls));
    });
});
