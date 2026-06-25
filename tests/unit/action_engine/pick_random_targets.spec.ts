import { test } from "@japa/runner";
import { hasRandomLimitedTarget } from "#api_types/target_matching";
import {
    collectEligibleActionTargets,
    pickRandomLimitedTargets,
} from "../../../app/galaguerre/action_engine/pick_random_targets.js";
import {
    createAllTargetSnapshot,
    createGameData,
    createMinionCard,
    createMinionState,
    createMinionTargetSnapshot,
    placeMinion,
} from "#tests/helpers/game/fixtures";

test.group("pick_random_targets", () => {
    test("hasRandomLimitedTarget returns true only when maxTargets and RANDOM are set", ({
        assert,
    }) => {
        assert.isFalse(hasRandomLimitedTarget(null));
        assert.isFalse(hasRandomLimitedTarget(createMinionTargetSnapshot("OPPONENT")));
        assert.isFalse(
            hasRandomLimitedTarget(
                createMinionTargetSnapshot("OPPONENT", {
                    maxTargets: 1,
                    targetSelectionMode: null,
                }),
            ),
        );
        assert.isFalse(
            hasRandomLimitedTarget(
                createMinionTargetSnapshot("OPPONENT", {
                    maxTargets: null,
                    targetSelectionMode: "RANDOM",
                }),
            ),
        );
        assert.isTrue(
            hasRandomLimitedTarget(
                createMinionTargetSnapshot("OPPONENT", {
                    maxTargets: 1,
                    targetSelectionMode: "RANDOM",
                }),
            ),
        );
    });

    test("collectEligibleActionTargets returns opponent minions only", ({ assert }) => {
        const data = createGameData();
        const allyMinion = createMinionState(createMinionCard({ uuid: "ally" }));
        const enemyMinion = createMinionState(createMinionCard({ uuid: "enemy" }));

        data.playerOne.board = placeMinion(data.playerOne.board, 0, allyMinion);
        data.playerTwo.board = placeMinion(data.playerTwo.board, 1, enemyMinion);

        const target = createMinionTargetSnapshot("OPPONENT", {
            maxTargets: 1,
            targetSelectionMode: "RANDOM",
        });

        const eligible = collectEligibleActionTargets(target, data.playerOne, data.playerTwo);

        assert.deepEqual(eligible, [{ minionUuid: "enemy", owner: "OPPONENT" }]);
    });

    test("collectEligibleActionTargets excludes source minion when excludeSelf is true", ({
        assert,
    }) => {
        const data = createGameData();
        const sourceMinion = createMinionState(createMinionCard({ uuid: "source" }));
        const allyMinion = createMinionState(createMinionCard({ uuid: "ally" }));

        data.playerOne.board = placeMinion(
            placeMinion(data.playerOne.board, 0, sourceMinion),
            1,
            allyMinion,
        );

        const target = createMinionTargetSnapshot("PLAYER", {
            excludeSelf: true,
            maxTargets: 1,
            targetSelectionMode: "RANDOM",
        });

        const eligible = collectEligibleActionTargets(
            target,
            data.playerOne,
            data.playerTwo,
            sourceMinion,
        );

        assert.deepEqual(eligible, [{ minionUuid: "ally", owner: "PLAYER" }]);
    });

    test("pickRandomLimitedTargets returns all eligible when maxTargets exceeds pool size", ({
        assert,
    }) => {
        const data = createGameData();
        const enemyMinion1 = createMinionState(createMinionCard({ uuid: "enemy-1" }));
        const enemyMinion2 = createMinionState(createMinionCard({ uuid: "enemy-2" }));

        data.playerTwo.board = placeMinion(
            placeMinion(data.playerTwo.board, 0, enemyMinion1),
            1,
            enemyMinion2,
        );

        const target = createMinionTargetSnapshot("OPPONENT", {
            maxTargets: 5,
            targetSelectionMode: "RANDOM",
        });

        const picks = pickRandomLimitedTargets(target, data.playerOne, data.playerTwo);

        assert.lengthOf(picks, 2);
    });

    test("pickRandomLimitedTargets returns empty array when no eligible target exists", ({
        assert,
    }) => {
        const data = createGameData();
        const target = createMinionTargetSnapshot("OPPONENT", {
            maxTargets: 1,
            targetSelectionMode: "RANDOM",
        });

        const picks = pickRandomLimitedTargets(target, data.playerOne, data.playerTwo);

        assert.deepEqual(picks, []);
    });

    test("collectEligibleActionTargets includes opponent stealth minions for random effects", ({
        assert,
    }) => {
        const data = createGameData();
        const visibleMinion = createMinionState(createMinionCard({ uuid: "visible" }));
        const stealthMinion = createMinionState(
            createMinionCard({
                uuid: "stealth",
                minionPowers: { hasStealth: true },
            }),
        );

        data.playerTwo.board = placeMinion(
            placeMinion(data.playerTwo.board, 0, visibleMinion),
            1,
            stealthMinion,
        );

        const target = createMinionTargetSnapshot("OPPONENT", {
            maxTargets: 1,
            targetSelectionMode: "RANDOM",
        });

        const eligible = collectEligibleActionTargets(target, data.playerOne, data.playerTwo);

        assert.lengthOf(eligible, 2);
        assert.isTrue(eligible.some((pick) => pick.minionUuid === "visible"));
        assert.isTrue(eligible.some((pick) => pick.minionUuid === "stealth"));
    });

    test("collectEligibleActionTargets includes opponent hero and minions for ALL target", ({
        assert,
    }) => {
        const data = createGameData();
        const enemyMinion = createMinionState(createMinionCard({ uuid: "enemy" }));

        data.playerTwo.board = placeMinion(data.playerTwo.board, 0, enemyMinion);

        const target = createAllTargetSnapshot("OPPONENT", {
            maxTargets: 3,
            targetSelectionMode: "RANDOM",
        });

        const eligible = collectEligibleActionTargets(target, data.playerOne, data.playerTwo);

        assert.lengthOf(eligible, 2);
        assert.isTrue(
            eligible.some((pick) => pick.minionUuid === null && pick.owner === "OPPONENT"),
        );
        assert.isTrue(eligible.some((pick) => pick.minionUuid === "enemy"));
    });

    test("pickRandomLimitedTargets never picks the same target twice", ({ assert }) => {
        const data = createGameData();

        for (let i = 0; i < 4; i++) {
            data.playerTwo.board = placeMinion(
                data.playerTwo.board,
                i,
                createMinionState(createMinionCard({ uuid: `enemy-${i}` })),
            );
        }

        const target = createAllTargetSnapshot("OPPONENT", {
            maxTargets: 3,
            targetSelectionMode: "RANDOM",
        });

        for (let run = 0; run < 100; run++) {
            const picks = pickRandomLimitedTargets(target, data.playerOne, data.playerTwo);

            assert.lengthOf(picks, 3);
            const keys = picks.map((pick) => pick.minionUuid ?? "hero");
            assert.equal(new Set(keys).size, 3);
        }
    });
});
