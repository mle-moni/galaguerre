import { test } from "@japa/runner";
import {
    heroMatchesTarget,
    minionMatchesTarget,
    selectedTargetMatchesAction,
    shouldExcludeSourceMinion,
} from "#api_types/target_matching";
import {
    createAllTargetSnapshot,
    createCardActionSnapshot,
    createComparisonSnapshot,
    createEmptyBoard,
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

    test("heroMatchesTarget matches both heroes when target type is ALL", ({ assert }) => {
        const target = createAllTargetSnapshot("ALL");

        assert.isTrue(heroMatchesTarget(target, false));
        assert.isTrue(heroMatchesTarget(target, true));
    });

    test("heroMatchesTarget with ALL type respects targetTeam OPPONENT", ({ assert }) => {
        const target = createAllTargetSnapshot("OPPONENT");

        assert.isFalse(heroMatchesTarget(target, false));
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
        const target = createMinionTargetSnapshot("ALL", { tag: "DEVELOPPEUR" });
        const matchingMinion = createMinionState(createMinionCard({ tags: ["DEVELOPPEUR"] }));
        const otherMinion = createMinionState(createMinionCard({ tags: ["PM"] }));

        assert.isTrue(minionMatchesTarget(matchingMinion, target, false));
        assert.isTrue(minionMatchesTarget(matchingMinion, target, true));
        assert.isFalse(minionMatchesTarget(otherMinion, target, false));
        assert.isFalse(minionMatchesTarget(otherMinion, target, true));
    });

    test("minionMatchesTarget matches minions on both teams when target type is ALL", ({
        assert,
    }) => {
        const target = createAllTargetSnapshot("ALL");
        const minion = createMinionState(createMinionCard());

        assert.isTrue(minionMatchesTarget(minion, target, false));
        assert.isTrue(minionMatchesTarget(minion, target, true));
    });

    test("minionMatchesTarget with ALL type still applies comparison filter", ({ assert }) => {
        const target = createAllTargetSnapshot("ALL", {
            comparison: createComparisonSnapshot({ attackComparison: ">", attack: 2 }),
        });
        const weakMinion = createMinionState(createMinionCard({ attack: 1 }));
        const strongMinion = createMinionState(createMinionCard({ attack: 3 }));

        assert.isFalse(minionMatchesTarget(weakMinion, target, false));
        assert.isTrue(minionMatchesTarget(strongMinion, target, true));
    });

    test("minionMatchesTarget with ALL type still applies tag filter", ({ assert }) => {
        const target = createAllTargetSnapshot("ALL", { tag: "DEVELOPPEUR" });
        const matchingMinion = createMinionState(createMinionCard({ tags: ["DEVELOPPEUR"] }));
        const otherMinion = createMinionState(createMinionCard({ tags: ["PM"] }));

        assert.isTrue(minionMatchesTarget(matchingMinion, target, false));
        assert.isFalse(minionMatchesTarget(otherMinion, target, true));
    });

    test("shouldExcludeSourceMinion skips only the source minion", ({ assert }) => {
        const source = createMinionState(createMinionCard({ uuid: "aura-source" }));
        const ally = createMinionState(createMinionCard({ uuid: "ally" }));
        const target = createMinionTargetSnapshot("PLAYER", { excludeSelf: true });

        assert.isTrue(shouldExcludeSourceMinion(target, source, source));
        assert.isFalse(shouldExcludeSourceMinion(target, source, ally));
        assert.isFalse(
            shouldExcludeSourceMinion(createMinionTargetSnapshot("PLAYER"), source, source),
        );
    });

    test("shouldExcludeSourceMinion with onlySelf keeps only the source minion", ({ assert }) => {
        const source = createMinionState(createMinionCard({ uuid: "passive-source" }));
        const ally = createMinionState(createMinionCard({ uuid: "ally" }));
        const target = createMinionTargetSnapshot("PLAYER", { onlySelf: true });

        assert.isFalse(shouldExcludeSourceMinion(target, source, source));
        assert.isTrue(shouldExcludeSourceMinion(target, source, ally));
        assert.isTrue(shouldExcludeSourceMinion(target, undefined, source));
    });

    test("selectedTargetMatchesAction rejects opponent minion with stealth", ({ assert }) => {
        const stealthCard = createMinionCard({
            uuid: "stealth-minion",
            minionPowers: { hasStealth: true },
        });
        const stealthMinion = createMinionState(stealthCard);
        const playerBoard = createEmptyBoard();
        const opponentBoard = { ...createEmptyBoard(), SPOT_1: stealthMinion };
        const action = createCardActionSnapshot({
            isTargeted: true,
            target: createMinionTargetSnapshot("OPPONENT"),
        });

        assert.isFalse(
            selectedTargetMatchesAction(
                { spotId: "SPOT_1", owner: "OPPONENT" },
                action,
                playerBoard,
                opponentBoard,
            ),
        );
    });

    test("selectedTargetMatchesAction allows ally minion with stealth", ({ assert }) => {
        const stealthCard = createMinionCard({
            uuid: "stealth-minion",
            minionPowers: { hasStealth: true },
        });
        const stealthMinion = createMinionState(stealthCard);
        const playerBoard = { ...createEmptyBoard(), SPOT_1: stealthMinion };
        const opponentBoard = createEmptyBoard();
        const action = createCardActionSnapshot({
            isTargeted: true,
            target: createMinionTargetSnapshot("PLAYER"),
        });

        assert.isTrue(
            selectedTargetMatchesAction(
                { spotId: "SPOT_1", owner: "PLAYER" },
                action,
                playerBoard,
                opponentBoard,
            ),
        );
    });

    test("minionMatchesTarget still matches stealth minions for AoE filtering", ({ assert }) => {
        const stealthCard = createMinionCard({
            uuid: "stealth-minion",
            minionPowers: { hasStealth: true },
        });
        const stealthMinion = createMinionState(stealthCard);
        const target = createMinionTargetSnapshot("OPPONENT");

        assert.isTrue(minionMatchesTarget(stealthMinion, target, true));
    });
});
