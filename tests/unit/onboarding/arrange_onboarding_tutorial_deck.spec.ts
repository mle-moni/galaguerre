import { test } from "@japa/runner";
import { arrangeOnboardingTutorialDeck } from "#services/onboarding/arrange_onboarding_tutorial_deck";
import { createMinionCard } from "#tests/helpers/game/fixtures";

test.group("onboarding tutorial deck", () => {
    test("arrangeOnboardingTutorialDeck places opening hand then mulligan top cards", ({
        assert,
    }) => {
        const source = [80, 101, 62, 76, 87, 99].flatMap((cardId) => [
            createMinionCard({ uuid: `card-${cardId}`, cardId, cost: cardId, baseCost: cardId }),
            createMinionCard({
                uuid: `card-${cardId}-dup`,
                cardId,
                cost: cardId,
                baseCost: cardId,
            }),
        ]);

        const arranged = arrangeOnboardingTutorialDeck(source, [80, 101, 62], [76, 87]);

        assert.deepEqual(
            arranged.slice(0, 5).map((card) => card.cardId),
            [80, 101, 62, 76, 87],
        );
    });
});
