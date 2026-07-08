import { syncUserWinsLosses } from "#database/seed_helpers/sync_user_wins_losses";
import Game from "#models/game";
import User from "#models/user";
import { TRAINING_AI_USER_ID } from "#services/training/training_constants";
import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import { DateTime } from "luxon";
import { bindUserIds, createTestGame } from "#tests/helpers/game/game_factory";
import { createGameData } from "#tests/helpers/game/fixtures";

test.group("sync user wins/losses", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("recomputes wins and losses from finished PVP games only", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const outsider = await User.create({
            email: `sync-outsider-${unique}@test.fr`,
            password: "test",
            wins: 99,
            losses: 88,
        });

        const {
            game: pvpWin,
            playerOne: winner,
            playerTwo: loser,
        } = await createTestGame(
            createGameData({
                state: "FINISHED",
                currentRound: 3,
                playerOne: { health: 5 },
                playerTwo: { health: 0 },
            }),
            { isFinished: true },
        );
        await pvpWin.merge({ winnerId: winner.id, endedAt: DateTime.now() }).save();

        const {
            game: pvpLoss,
            playerOne: loserTwo,
            playerTwo: winnerTwo,
        } = await createTestGame(
            createGameData({
                state: "FINISHED",
                currentRound: 4,
                playerOne: { health: 0 },
                playerTwo: { health: 3 },
            }),
            { isFinished: true },
        );
        await pvpLoss.merge({ winnerId: winnerTwo.id, endedAt: DateTime.now() }).save();

        const human = await User.create({
            email: `sync-training-${unique}@test.fr`,
            password: "test",
            wins: 50,
            losses: 40,
        });
        const trainingData = bindUserIds(
            createGameData({
                state: "FINISHED",
                currentRound: 2,
                isTraining: true,
                playerOne: { health: 5 },
                playerTwo: { health: 0 },
            }),
            human.id,
            TRAINING_AI_USER_ID,
        );
        await Game.create({
            playerOneId: human.id,
            playerTwoId: null,
            data: trainingData,
            isFinished: true,
            winnerId: human.id,
            endedAt: DateTime.now(),
        });

        await winner.merge({ wins: 10, losses: 20 }).save();
        await loser.merge({ wins: 30, losses: 5 }).save();
        await winnerTwo.merge({ wins: 7, losses: 3 }).save();
        await loserTwo.merge({ wins: 2, losses: 9 }).save();

        await syncUserWinsLosses();

        await winner.refresh();
        await loser.refresh();
        await winnerTwo.refresh();
        await loserTwo.refresh();
        await human.refresh();
        await outsider.refresh();

        assert.equal(winner.wins, 1);
        assert.equal(winner.losses, 0);
        assert.equal(loser.wins, 0);
        assert.equal(loser.losses, 1);
        assert.equal(winnerTwo.wins, 1);
        assert.equal(winnerTwo.losses, 0);
        assert.equal(loserTwo.wins, 0);
        assert.equal(loserTwo.losses, 1);
        assert.equal(human.wins, 0);
        assert.equal(human.losses, 0);
        assert.equal(outsider.wins, 0);
        assert.equal(outsider.losses, 0);
    });
});
