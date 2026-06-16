import { COIN_CARD_ID } from "#api_types/game.types";
import { test } from "@japa/runner";
import { instantiateDeckCard } from "#galaguerre/deck_card_operations";
import { createGameData } from "#tests/helpers/game/fixtures";
import { runPlaySpell } from "#tests/helpers/game/run_play_minion";

const createCoinCard = () => {
    const coin = instantiateDeckCard(COIN_CARD_ID);
    if (!coin || coin.type !== "SPELL") {
        throw new Error("Expected coin spell card");
    }
    return coin;
};

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

    test("The Coin costs 0 mana and uses MANA TEMPORARY_CHANGE action", ({ assert }) => {
        const coin = createCoinCard();
        assert.equal(coin.cost, 0);
        assert.equal(coin.cardId, COIN_CARD_ID);
        assert.equal(coin.spellActions.length, 1);
        assert.equal(coin.spellActions[0]!.type, "MANA");
        if (coin.spellActions[0]!.type === "MANA") {
            assert.equal(coin.spellActions[0]!.subtype, "TEMPORARY_CHANGE");
            assert.equal(coin.spellActions[0]!.amount, 1);
        }
    });
});
