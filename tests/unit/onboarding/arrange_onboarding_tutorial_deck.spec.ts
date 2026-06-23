import { test } from "@japa/runner";
import { arrangeOnboardingTutorialDeck } from "#services/onboarding/arrange_onboarding_tutorial_deck";
import type { PlayerCard } from "#api_types/game.types";

const createStubCard = (cardId: number): PlayerCard =>
    ({
        uuid: `card-${cardId}`,
        cardId,
        label: `Card ${cardId}`,
        type: "MINION",
        cost: cardId,
        baseCost: cardId,
        attack: 1,
        health: 1,
        dynamicCost: null,
        tags: [],
        effects: [],
        description: "",
        minionPowers: null,
        battlecryActions: [],
        deathrattleActions: [],
        passives: [],
    }) as PlayerCard;

test.group("onboarding tutorial deck", () => {
    test("arrangeOnboardingTutorialDeck places opening hand then mulligan top cards", ({
        assert,
    }) => {
        const source = [80, 101, 62, 76, 87, 99].flatMap((cardId) => [
            createStubCard(cardId),
            createStubCard(cardId),
        ]);

        const arranged = arrangeOnboardingTutorialDeck(source, [80, 101, 62], [76, 87]);

        assert.deepEqual(
            arranged.slice(0, 5).map((card) => card.cardId),
            [80, 101, 62, 76, 87],
        );
    });
});
