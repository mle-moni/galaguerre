import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import LeaderboardController from "#controllers/leaderboard/leaderboard_controller";
import User from "#models/user";
import type { HttpContext } from "@adonisjs/core/http";

test.group("leaderboard: elo", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("breaks ties by user id", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const firstPlayer = await User.create({
            email: `elo-tie-a-${unique}@test.fr`,
            password: "test",
            pseudo: "EloTieA",
            elo: 1500,
            wins: 10,
            losses: 5,
        });
        const secondPlayer = await User.create({
            email: `elo-tie-b-${unique}@test.fr`,
            password: "test",
            pseudo: "EloTieB",
            elo: 1500,
            wins: 10,
            losses: 5,
        });

        const controller = new LeaderboardController();
        const entries = await controller.index({} as HttpContext);
        const tiedEntries = entries.filter(
            (entry) => entry.userId === firstPlayer.id || entry.userId === secondPlayer.id,
        );

        assert.equal(tiedEntries.length, 2);
        assert.equal(tiedEntries[0]!.userId, firstPlayer.id);
        assert.equal(tiedEntries[1]!.userId, secondPlayer.id);
    });
});
