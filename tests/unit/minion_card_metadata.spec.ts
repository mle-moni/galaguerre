import { test } from "@japa/runner";
import {
    getDynamicCostDescription,
    getMinionCardDescription,
    getWeaponCardDescription,
} from "../../api_types/minion_card_description.js";

test.group("minion_card_metadata", () => {
    test("getMinionCardDescription includes minion power effect details", ({ assert }) => {
        const description = getMinionCardDescription(1, 2, ["Provocation"], []);

        assert.equal(description, "Monstre 1/2. Provocation.");
    });

    test("getMinionCardDescription includes battlecry lines", ({ assert }) => {
        const description = getMinionCardDescription(
            2,
            2,
            [],
            ["Cri de guerre : Inflige 2 dégâts au héros adverse."],
        );

        assert.equal(
            description,
            "Monstre 2/2. Cri de guerre : Inflige 2 dégâts au héros adverse.",
        );
    });

    test("getMinionCardDescription combines provocation and deathrattle in one line", ({
        assert,
    }) => {
        const description = getMinionCardDescription(
            4,
            4,
            ["Provocation"],
            [],
            ["Dernier souffle : Inflige 2 dégâts à tous les personnages."],
        );

        assert.equal(
            description,
            "Monstre 4/4. Provocation. Dernier souffle : Inflige 2 dégâts à tous les personnages.",
        );
    });

    test("getMinionCardDescription omits optional sections when empty", ({ assert }) => {
        const description = getMinionCardDescription(2, 1, [], []);

        assert.equal(description, "Monstre 2/1.");
    });

    test("getWeaponCardDescription joins deathrattle on the same line", ({ assert }) => {
        const description = getWeaponCardDescription(3, 2, [
            "Dernier souffle : Inflige 1 dégât au héros adverse.",
        ]);

        assert.equal(description, "Arme 3/2. Dernier souffle : Inflige 1 dégât au héros adverse.");
    });

    test("getMinionCardDescription includes dynamic cost reductions", ({ assert }) => {
        const description = getMinionCardDescription(8, 8, [], [], [], [], {
            reductions: [{ source: "HAND_CARD_COUNT", amountPer: 1 }],
        });

        assert.equal(description, "Monstre 8/8. Coût réduit de 1 pour chaque carte en main.");
    });

    test("getDynamicCostDescription supports all reduction sources", ({ assert }) => {
        assert.deepEqual(getDynamicCostDescription(null), []);
        assert.deepEqual(
            getDynamicCostDescription({
                reductions: [{ source: "BOARD_MINION_COUNT", amountPer: 2 }],
            }),
            ["Coût réduit de 2 pour chaque monstre sur le plateau."],
        );
        assert.deepEqual(
            getDynamicCostDescription({
                reductions: [
                    { source: "HAND_CARD_COUNT", amountPer: 1 },
                    { source: "HERO_MISSING_HEALTH", amountPer: 1 },
                ],
            }),
            [
                "Coût réduit de 1 pour chaque carte en main.",
                "Coût réduit de 1 pour chaque point de vie manquant au héros.",
            ],
        );
    });
});
