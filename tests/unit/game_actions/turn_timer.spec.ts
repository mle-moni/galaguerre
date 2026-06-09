import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import {
    clearAllGameTimers,
    handleTurnTimerExpired,
} from "../../../app/galaguerre/timers/game_timers.js";
import { createTestGame } from "#tests/helpers/game/game_factory";
import { createGameData, createMinionCard } from "#tests/helpers/game/fixtures";

test.group("game:turn_timer", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("turn timer expiration auto-passes the active turn", async ({ assert }) => {
        const { game } = await createTestGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 1,
                playerOne: { mana: 1 },
                playerTwo: {
                    deckCards: [createMinionCard({ uuid: "p2-draw" })],
                    hand: [],
                },
            }),
        );

        const expectedEndsAt = Date.now() + 75_000;
        game.data.turnEndsAt = expectedEndsAt;
        await game.save();

        await handleTurnTimerExpired(game.id, expectedEndsAt);
        await game.refresh();

        assert.equal(game.data.state, "PLAYER_TWO_TURN");
        assert.equal(game.data.playerTwo.hand.length, 1);

        clearAllGameTimers(game.id);
    });
});
