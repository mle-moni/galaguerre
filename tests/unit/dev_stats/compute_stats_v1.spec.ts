import { test } from "@japa/runner";
import {
    collectPlayedCardIdsForPlayer,
    resolveWinnerSideFromData,
} from "#services/dev_stats/compute_stats_v1";
import { createGameData, createMinionCard } from "#tests/helpers/game/fixtures";

test.group("dev_stats:v1 helpers", () => {
    test("resolveWinnerSideFromData prefers stored winnerSide", ({ assert }) => {
        const data = createGameData({
            winnerSide: "PLAYER_ONE",
            playerOne: { health: 0 },
            playerTwo: { health: 0 },
        });

        assert.equal(resolveWinnerSideFromData(data), "PLAYER_ONE");
    });

    test("resolveWinnerSideFromData derives side from health when missing", ({ assert }) => {
        const data = createGameData({
            playerOne: { health: 0 },
            playerTwo: { health: 5 },
        });

        assert.equal(resolveWinnerSideFromData(data), "PLAYER_TWO");
    });

    test("collectPlayedCardIdsForPlayer returns unique cardIds for that player", ({ assert }) => {
        const cardA = createMinionCard({ cardId: 10, uuid: "a" });
        const cardB = createMinionCard({ cardId: 20, uuid: "b" });
        const cardAAgain = createMinionCard({ cardId: 10, uuid: "a2" });

        const data = createGameData({
            actionLog: [
                {
                    id: "1",
                    roundNumber: 1,
                    playerId: 1,
                    type: "PLAY_CARD",
                    card: cardA,
                },
                {
                    id: "2",
                    roundNumber: 1,
                    playerId: 2,
                    type: "PLAY_CARD",
                    card: cardB,
                },
                {
                    id: "3",
                    roundNumber: 2,
                    playerId: 1,
                    type: "PLAY_CARD",
                    card: cardAAgain,
                },
                {
                    id: "4",
                    roundNumber: 2,
                    playerId: 1,
                    type: "PASS_TURN",
                },
            ],
        });

        assert.deepEqual(
            [...collectPlayedCardIdsForPlayer(data, 1)].sort((a, b) => a - b),
            [10],
        );
        assert.deepEqual([...collectPlayedCardIdsForPlayer(data, 2)], [20]);
    });
});
