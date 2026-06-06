import { test } from "@japa/runner";
import {
    heroMatchesTarget,
    isAuraSourceExcluded,
    minionMatchesTarget,
} from "#api_types/target_matching";
import {
    createComparisonSnapshot,
    createHeroTargetSnapshot,
    createMinionCard,
    createMinionState,
    createMinionTargetSnapshot,
} from "#tests/helpers/game/fixtures";

test.group("target_matching", () => {
    test("heroMatchesTarget matches player hero when targetTeam is PLAYER", ({ assert }) => {
        const target = createHeroTargetSnapshot("PLAYER");

        assert.isTrue(heroMatchesTarget(target, false));
        assert.isFalse(heroMatchesTarget(target, true));
    });

    test("heroMatchesTarget matches opponent hero when targetTeam is OPPONENT", ({ assert }) => {
        const target = createHeroTargetSnapshot("OPPONENT");

        assert.isFalse(heroMatchesTarget(target, false));
        assert.isTrue(heroMatchesTarget(target, true));
    });

    test("heroMatchesTarget matches both heroes when targetTeam is ALL", ({ assert }) => {
        const target = createHeroTargetSnapshot("ALL");

        assert.isTrue(heroMatchesTarget(target, false));
        assert.isTrue(heroMatchesTarget(target, true));
    });

    test("heroMatchesTarget returns false for non-HERO target type", ({ assert }) => {
        const target = createMinionTargetSnapshot("ALL");

        assert.isFalse(heroMatchesTarget(target, false));
        assert.isFalse(heroMatchesTarget(target, true));
    });

    test("minionMatchesTarget matches ally minion when targetTeam is PLAYER", ({ assert }) => {
        const target = createMinionTargetSnapshot("PLAYER");
        const minion = createMinionState(createMinionCard());

        assert.isTrue(minionMatchesTarget(minion, target, false));
        assert.isFalse(minionMatchesTarget(minion, target, true));
    });

    test("minionMatchesTarget matches opponent minion when targetTeam is OPPONENT", ({
        assert,
    }) => {
        const target = createMinionTargetSnapshot("OPPONENT");
        const minion = createMinionState(createMinionCard());

        assert.isFalse(minionMatchesTarget(minion, target, false));
        assert.isTrue(minionMatchesTarget(minion, target, true));
    });

    test("minionMatchesTarget matches minions on both teams when targetTeam is ALL", ({
        assert,
    }) => {
        const target = createMinionTargetSnapshot("ALL");
        const minion = createMinionState(createMinionCard());

        assert.isTrue(minionMatchesTarget(minion, target, false));
        assert.isTrue(minionMatchesTarget(minion, target, true));
    });

    test("minionMatchesTarget with ALL still applies comparison filter", ({ assert }) => {
        const target = createMinionTargetSnapshot("ALL", {
            comparison: createComparisonSnapshot({ attackComparison: ">", attack: 2 }),
        });
        const weakMinion = createMinionState(createMinionCard({ attack: 1 }));
        const strongMinion = createMinionState(createMinionCard({ attack: 3 }));

        assert.isFalse(minionMatchesTarget(weakMinion, target, false));
        assert.isFalse(minionMatchesTarget(weakMinion, target, true));
        assert.isTrue(minionMatchesTarget(strongMinion, target, false));
        assert.isTrue(minionMatchesTarget(strongMinion, target, true));
    });

    test("minionMatchesTarget with ALL still applies tag filter", ({ assert }) => {
        const target = createMinionTargetSnapshot("ALL", { tagId: 42 });
        const matchingMinion = createMinionState(createMinionCard({ tagIds: [42] }));
        const otherMinion = createMinionState(createMinionCard({ tagIds: [1] }));

        assert.isTrue(minionMatchesTarget(matchingMinion, target, false));
        assert.isTrue(minionMatchesTarget(matchingMinion, target, true));
        assert.isFalse(minionMatchesTarget(otherMinion, target, false));
        assert.isFalse(minionMatchesTarget(otherMinion, target, true));
    });

    test("isAuraSourceExcluded skips only the aura source minion", ({ assert }) => {
        const source = createMinionState(createMinionCard({ uuid: "aura-source" }));
        const ally = createMinionState(createMinionCard({ uuid: "ally" }));
        const target = createMinionTargetSnapshot("PLAYER", { excludeSelf: true });

        assert.isTrue(isAuraSourceExcluded(target, source, source));
        assert.isFalse(isAuraSourceExcluded(target, source, ally));
        assert.isFalse(
            isAuraSourceExcluded(createMinionTargetSnapshot("PLAYER"), source, source),
        );
    });
});
