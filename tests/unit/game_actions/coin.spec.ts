import { COIN_CARD_ID } from "#api_types/game.types";
import { test } from "@japa/runner";
import { createCoinCard } from "#galaguerre/coin";
import { createGameData } from "#tests/helpers/game/fixtures";
import { runPlaySpell } from "#tests/helpers/game/run_play_minion";

test.group("The Coin", () => {
    test("playing The Coin grants +1 mana and removes it from hand", async ({ assert }) => {
        const coin = createCoinCard();

        const { game } = await runPlaySpell(
            createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 1,
                playerOne: {
                    mana: 1,
                    hand: [coin],
                },
            }),
            coin,
        );

        assert.equal(game.data.playerOne.mana, 2);
        assert.equal(game.data.playerOne.hand.length, 0);
    });

    test("The Coin costs 0 mana", ({ assert }) => {
        const coin = createCoinCard();
        assert.equal(coin.cost, 0);
        assert.equal(coin.cardId, COIN_CARD_ID);
    });
});
