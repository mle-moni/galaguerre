import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import { COIN_CARD_ID } from "#api_types/game.types";
import {
    clearAllGameTimers,
    restoreGameTimers,
} from "../../../app/galaguerre/timers/game_timers.js";
import { createTestGame } from "#tests/helpers/game/game_factory";
import { createGameData, createMinionCard } from "#tests/helpers/game/fixtures";

test.group("game:restore_game_timers", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("restores an overdue turn timer by auto-passing the active turn", async ({ assert }) => {
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

        game.data.turnEndsAt = Date.now() - 1_000;
        await game.save();

        await restoreGameTimers();
        await game.refresh();

        assert.equal(game.data.state, "PLAYER_TWO_TURN");
        assert.equal(game.data.playerTwo.hand.length, 1);

        clearAllGameTimers(game.id);
    });

    test("restores an overdue mulligan timer by finalizing mulligan", async ({ assert }) => {
        const { game } = await createTestGame(
            createGameData({
                state: "MULLIGAN",
                mulligan: {
                    playerOneDone: false,
                    playerTwoDone: false,
                },
            }),
        );

        game.data.mulliganEndsAt = Date.now() - 1_000;
        await game.save();

        await restoreGameTimers();
        await game.refresh();

        assert.equal(game.data.state, "PLAYER_ONE_TURN");
        assert.isTrue(game.data.playerTwo.hand.some((card) => card.cardId === COIN_CARD_ID));

        clearAllGameTimers(game.id);
    });

    test("does not expire a turn timer that is still in the future", async ({ assert }) => {
        const { game } = await createTestGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 1,
            }),
        );

        game.data.turnEndsAt = Date.now() + 60_000;
        await game.save();

        await restoreGameTimers();
        await game.refresh();

        assert.equal(game.data.state, "PLAYER_ONE_TURN");

        clearAllGameTimers(game.id);
    });
});
