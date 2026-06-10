import { COIN_CARD_ID } from "#api_types/game.types";
import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import { createCoinCard } from "../../../app/galaguerre/coin.js";
import { assertPlayCardScenario, runPlayCard } from "#tests/helpers/game/run_play_card";
import { createGameData } from "#tests/helpers/game/fixtures";

test.group("game:coin", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("playing The Coin grants +1 mana and removes it from hand", async ({ assert }) => {
        const coin = createCoinCard();

        const result = await runPlayCard({
            data: createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 1,
                playerOne: {
                    mana: 1,
                    hand: [coin],
                },
            }),
            actor: "playerOne",
            action: {
                cardId: coin.uuid,
                spotId: null,
                owner: "PLAYER",
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assert.equal(result.game.data.playerOne.mana, 2);
        assert.equal(result.game.data.playerOne.hand.length, 0);
    });

    test("The Coin costs 0 mana", async ({ assert }) => {
        const coin = createCoinCard();
        assert.equal(coin.cost, 0);
        assert.equal(coin.cardId, COIN_CARD_ID);
    });
});
