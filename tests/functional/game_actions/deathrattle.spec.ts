import { DEFAULT_HERO_HEALTH } from "#api_types/game.types";
import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import { assertBoardSpot, assertPlayerHealth } from "#tests/helpers/game/assertions";
import {
    createGameData,
    createMinionCard,
    createMinionState,
    MINION_IDS,
    placeMinion,
} from "#tests/helpers/game/fixtures";
import { assertMinionActionScenario, runMinionAction } from "#tests/helpers/game/run_minion_action";

test.group("game:deathrattle", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("minion without deathrattle dies in combat as before", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 3,
            health: 3,
        });
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 1,
            health: 1,
        });

        const result = await runMinionAction({
            data: createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        "SPOT_1",
                        createMinionState(attackerCard),
                    ),
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        "SPOT_1",
                        createMinionState(targetCard),
                    ),
                },
            }),
            actor: "playerOne",
            action: {
                minionId: MINION_IDS.attacker,
                spotId: "SPOT_1",
                owner: "OPPONENT",
            },
            expect: { error: null },
        });

        assertMinionActionScenario(assert, result, { error: null });
        assertBoardSpot(assert, result.game, "playerTwo", "SPOT_1", null);
        assertPlayerHealth(assert, result.game, "playerOne", DEFAULT_HERO_HEALTH);
        assertPlayerHealth(assert, result.game, "playerTwo", DEFAULT_HERO_HEALTH);
    });
});
