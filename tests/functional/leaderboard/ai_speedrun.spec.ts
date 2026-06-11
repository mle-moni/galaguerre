import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import { getAiSpeedrunLeaderboard } from "#services/leaderboard/get_ai_speedrun_leaderboard";
import Game from "#models/game";
import User from "#models/user";
import { TRAINING_AI_USER_ID } from "#services/training/training_constants";
import { DateTime } from "luxon";
import { bindUserIds, createTestGame } from "#tests/helpers/game/game_factory";
import { createGameData } from "#tests/helpers/game/fixtures";

const createFinishedTrainingGame = async ({
    human,
    humanWins,
    roundCount,
    durationSeconds,
    humanAsPlayerOne = true,
}: {
    human: User;
    humanWins: boolean;
    roundCount: number;
    durationSeconds: number;
    humanAsPlayerOne?: boolean;
}) => {
    const endedAt = DateTime.now();
    const createdAt = endedAt.minus({ seconds: durationSeconds });

    const data = bindUserIds(
        createGameData({
            state: "FINISHED",
            isTraining: true,
            currentRound: roundCount,
            playerOne: { health: humanWins && humanAsPlayerOne ? 5 : 0 },
            playerTwo: { health: humanWins && !humanAsPlayerOne ? 5 : 0 },
        }),
        humanAsPlayerOne ? human.id : TRAINING_AI_USER_ID,
        humanAsPlayerOne ? TRAINING_AI_USER_ID : human.id,
    );

    return Game.create({
        playerOneId: humanAsPlayerOne ? human.id : null,
        playerTwoId: humanAsPlayerOne ? null : human.id,
        data,
        isFinished: true,
        winnerId: humanWins ? human.id : null,
        createdAt,
        endedAt,
    });
};

test.group("leaderboard: ai speedrun", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("returns only training wins sorted by duration", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const fastPlayer = await User.create({
            email: `speedrun-fast-${unique}@test.fr`,
            password: "test",
            pseudo: "FastRunner",
        });
        const slowPlayer = await User.create({
            email: `speedrun-slow-${unique}@test.fr`,
            password: "test",
            pseudo: "SlowRunner",
        });
        const loser = await User.create({
            email: `speedrun-loser-${unique}@test.fr`,
            password: "test",
            pseudo: "Loser",
        });

        await createFinishedTrainingGame({
            human: fastPlayer,
            humanWins: true,
            roundCount: 4,
            durationSeconds: 60,
        });
        await createFinishedTrainingGame({
            human: slowPlayer,
            humanWins: true,
            roundCount: 8,
            durationSeconds: 180,
        });
        await createFinishedTrainingGame({
            human: loser,
            humanWins: false,
            roundCount: 10,
            durationSeconds: 30,
        });

        const {
            game: pvpGame,
            playerOne,
            playerTwo,
        } = await createTestGame(
            createGameData({
                state: "FINISHED",
                currentRound: 3,
                playerOne: { health: 5 },
                playerTwo: { health: 0 },
            }),
            { isFinished: true },
        );
        await pvpGame.merge({ winnerId: playerOne.id, endedAt: DateTime.now() }).save();

        const entries = await getAiSpeedrunLeaderboard();

        assert.equal(entries.length, 2);
        assert.equal(entries[0]!.userId, fastPlayer.id);
        assert.equal(entries[0]!.pseudo, "FastRunner");
        assert.equal(entries[0]!.rank, 1);
        assert.equal(entries[0]!.durationSeconds, 60);
        assert.equal(entries[0]!.roundCount, 4);
        assert.equal(entries[1]!.userId, slowPlayer.id);
        assert.equal(entries[1]!.rank, 2);
        assert.equal(entries[1]!.durationSeconds, 180);
        assert.isFalse(entries.some((entry) => entry.userId === loser.id));
        assert.isFalse(entries.some((entry) => entry.userId === playerTwo.id));
    });

    test("keeps only the best run per player", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const player = await User.create({
            email: `speedrun-best-${unique}@test.fr`,
            password: "test",
            pseudo: "BestRun",
        });

        await createFinishedTrainingGame({
            human: player,
            humanWins: true,
            roundCount: 12,
            durationSeconds: 300,
        });
        await createFinishedTrainingGame({
            human: player,
            humanWins: true,
            roundCount: 5,
            durationSeconds: 90,
            humanAsPlayerOne: false,
        });

        const entries = await getAiSpeedrunLeaderboard();

        assert.equal(entries.length, 1);
        assert.equal(entries[0]!.userId, player.id);
        assert.equal(entries[0]!.durationSeconds, 90);
        assert.equal(entries[0]!.roundCount, 5);
    });

    test("breaks ties by round count", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const fewerRounds = await User.create({
            email: `speedrun-tie-a-${unique}@test.fr`,
            password: "test",
            pseudo: "FewerRounds",
        });
        const moreRounds = await User.create({
            email: `speedrun-tie-b-${unique}@test.fr`,
            password: "test",
            pseudo: "MoreRounds",
        });

        await createFinishedTrainingGame({
            human: moreRounds,
            humanWins: true,
            roundCount: 9,
            durationSeconds: 120,
        });
        await createFinishedTrainingGame({
            human: fewerRounds,
            humanWins: true,
            roundCount: 6,
            durationSeconds: 120,
        });

        const entries = await getAiSpeedrunLeaderboard();

        assert.equal(entries.length, 2);
        assert.equal(entries[0]!.userId, fewerRounds.id);
        assert.equal(entries[0]!.roundCount, 6);
        assert.equal(entries[1]!.userId, moreRounds.id);
        assert.equal(entries[1]!.roundCount, 9);
    });

    test("breaks full ties by user id", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const firstPlayer = await User.create({
            email: `speedrun-full-tie-a-${unique}@test.fr`,
            password: "test",
            pseudo: "FullTieA",
        });
        const secondPlayer = await User.create({
            email: `speedrun-full-tie-b-${unique}@test.fr`,
            password: "test",
            pseudo: "FullTieB",
        });

        await createFinishedTrainingGame({
            human: secondPlayer,
            humanWins: true,
            roundCount: 7,
            durationSeconds: 150,
        });
        await createFinishedTrainingGame({
            human: firstPlayer,
            humanWins: true,
            roundCount: 7,
            durationSeconds: 150,
        });

        const entries = await getAiSpeedrunLeaderboard();
        const tiedEntries = entries.filter(
            (entry) => entry.userId === firstPlayer.id || entry.userId === secondPlayer.id,
        );

        assert.equal(tiedEntries.length, 2);
        assert.equal(tiedEntries[0]!.userId, firstPlayer.id);
        assert.equal(tiedEntries[1]!.userId, secondPlayer.id);
    });
});
