import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import {
    clearAllGameTimers,
    handleTurnTimerExpired,
} from "../../../app/galaguerre/timers/game_timers.js";
import { createTestGame } from "#tests/helpers/game/game_factory";
import {
    createCardActionSnapshot,
    createCardFilterSnapshot,
    createGameData,
    createSpellCard,
} from "#tests/helpers/game/fixtures";
import { runSpellEffect } from "#tests/helpers/game/run_spell_effect";

const createDoubleDiscoverSpell = () =>
    createSpellCard({
        uuid: "double-discover-spell",
        cardId: 153,
        label: "Zoothérapie",
        cost: 3,
        spellActions: [
            createCardActionSnapshot({
                type: "DISCOVER",
                discoverCardFilter: createCardFilterSnapshot({ type: "MINION" }),
                optionCount: 3,
            }),
            createCardActionSnapshot({
                type: "DISCOVER",
                discoverCardFilter: createCardFilterSnapshot({ type: "MINION" }),
                optionCount: 3,
            }),
        ],
    });

test.group("game:turn_timer_discover", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("turn timer expiration auto-resolves a simple discover then passes turn", async ({
        assert,
    }) => {
        const spell = createSpellCard({
            spellActions: [
                createCardActionSnapshot({
                    type: "DISCOVER",
                    discoverCardFilter: createCardFilterSnapshot({ type: "MINION" }),
                    optionCount: 3,
                }),
            ],
        });

        const { game: inMemoryGame } = runSpellEffect(
            createGameData({
                state: "PLAYER_ONE_TURN",
                playerOne: { mana: 10, hand: [spell] },
            }),
            spell,
        );

        const { game } = await createTestGame(inMemoryGame.data);
        if (game.data.pendingDiscover) {
            game.data.pendingDiscover.playerUserId = game.data.playerOne.userId;
        }
        const expectedEndsAt = Date.now() + 75_000;
        game.data.turnEndsAt = expectedEndsAt;
        await game.save();

        await handleTurnTimerExpired(game.id, expectedEndsAt);
        await game.refresh();

        assert.isUndefined(game.data.pendingDiscover);
        assert.equal(game.data.state, "PLAYER_TWO_TURN");
        assert.lengthOf(game.data.playerOne.hand, 2);

        clearAllGameTimers(game.id);
    });

    test("turn timer expiration auto-resolves a double discover then passes turn", async ({
        assert,
    }) => {
        const spell = createDoubleDiscoverSpell();

        const { game: inMemoryGame } = runSpellEffect(
            createGameData({
                state: "PLAYER_ONE_TURN",
                playerOne: { mana: 10, hand: [spell] },
            }),
            spell,
        );

        const { game } = await createTestGame(inMemoryGame.data);
        if (game.data.pendingDiscover) {
            game.data.pendingDiscover.playerUserId = game.data.playerOne.userId;
        }
        const expectedEndsAt = Date.now() + 75_000;
        game.data.turnEndsAt = expectedEndsAt;
        await game.save();

        await handleTurnTimerExpired(game.id, expectedEndsAt);
        await game.refresh();

        assert.isUndefined(game.data.pendingDiscover);
        assert.equal(game.data.state, "PLAYER_TWO_TURN");
        assert.lengthOf(game.data.playerOne.hand, 3);

        clearAllGameTimers(game.id);
    });
});
