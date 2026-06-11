import { test } from "@japa/runner";
import { formatActionDescription } from "#api_types/format_action_description";
import { getDisplayedDamage, getEffectiveDamage } from "#api_types/get_effective_damage";
import {
    createCardActionSnapshot,
    createCardFilterSnapshot,
    createMinionTargetSnapshot,
} from "#tests/helpers/game/fixtures";

test.group("get_effective_damage", () => {
    test("returns base damage when spell power is zero", ({ assert }) => {
        const action = createCardActionSnapshot({ type: "DAMAGE", damage: 3 });

        assert.equal(getEffectiveDamage(action, 0), 3);
        assert.equal(getDisplayedDamage(action, 0), 3);
    });

    test("adds spell power bonus to displayed damage", ({ assert }) => {
        const action = createCardActionSnapshot({ type: "DAMAGE", damage: 3 });

        assert.equal(getEffectiveDamage(action, 2), 5);
        assert.equal(getDisplayedDamage(action, 2), 5);
    });

    test("ignores spell power when not provided", ({ assert }) => {
        const action = createCardActionSnapshot({ type: "DAMAGE", damage: 3 });

        assert.equal(getDisplayedDamage(action), 3);
    });
});

test.group("format_action_description", () => {
    test("uses effective damage for spell descriptions", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "DAMAGE",
            isTargeted: false,
            damage: 3,
        });

        assert.equal(
            formatActionDescription(action, "Effet", 2),
            "Effet : Inflige 5 dégâts au héros adverse.",
        );
    });

    test("keeps base damage when spell power is not provided", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "DAMAGE",
            isTargeted: false,
            damage: 3,
        });

        assert.equal(
            formatActionDescription(action, "Effet"),
            "Effet : Inflige 3 dégâts au héros adverse.",
        );
    });

    test("formats random limited minion damage", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "DAMAGE",
            isTargeted: false,
            damage: 1,
            target: createMinionTargetSnapshot("OPPONENT", {
                maxTargets: 1,
                targetSelectionMode: "RANDOM",
            }),
        });

        assert.equal(
            formatActionDescription(action, "Effet"),
            "Effet : Inflige 1 dégâts à un serviteur adverse aléatoire.",
        );
    });

    test("formats draw with explicit tag label", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "DRAW",
            drawCount: 1,
            drawCardFilter: createCardFilterSnapshot({
                type: "MINION",
                tags: ["BEAST"],
            }),
        });

        assert.equal(
            formatActionDescription(action, "Cri de guerre"),
            "Cri de guerre : Pioche 1 carte Monstre + 🦁 Bête.",
        );
    });

    test("formats targeted damage to any minion without redundant team label", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "DAMAGE",
            isTargeted: true,
            damage: 6,
            target: createMinionTargetSnapshot("ALL"),
        });

        assert.equal(
            formatActionDescription(action, "Effet"),
            "Effet : Inflige 6 dégâts à un serviteur.",
        );
    });

    test("formats targeted damage with explicit tag label", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "DAMAGE",
            isTargeted: true,
            damage: 2,
            target: createMinionTargetSnapshot("OPPONENT", {
                tag: "BEAST",
            }),
        });

        assert.equal(
            formatActionDescription(action, "Cri de guerre"),
            "Cri de guerre : Inflige 2 dégâts à un serviteur adverse 🦁 Bête.",
        );
    });

    test("contracts à les into aux for mass opponent minion damage", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "DAMAGE",
            isTargeted: false,
            damage: 3,
            target: createMinionTargetSnapshot("OPPONENT"),
        });

        assert.equal(
            formatActionDescription(action, "Effet"),
            "Effet : Inflige 3 dégâts aux serviteurs adverses.",
        );
    });

    test("contracts à les into aux for mass opponent minion heal", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "HEAL",
            isTargeted: false,
            heal: 2,
            target: createMinionTargetSnapshot("OPPONENT"),
        });

        assert.equal(
            formatActionDescription(action, "Effet"),
            "Effet : Rend 2 PV aux serviteurs adverses.",
        );
    });
});
