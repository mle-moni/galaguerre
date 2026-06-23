import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import { terminateGame } from "#controllers/games/terminate_game";
import { completeOnboardingIfNeeded } from "#services/onboarding/complete_onboarding_if_needed";
import { getTrainingGameHumanUserId } from "#services/onboarding/get_training_game_human_user_id";
import { TRAINING_AI_USER_ID } from "#services/training/training_constants";
import Game from "#models/game";
import User from "#models/user";
import { bindUserIds, createTestGame } from "#tests/helpers/game/game_factory";
import { createGameData } from "#tests/helpers/game/fixtures";

test.group("onboarding", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("completeOnboardingIfNeeded sets onboardingCompletedAt once", async ({ assert }) => {
        const user = await User.create({
            email: "onboarding-once@test.fr",
            pseudo: "onboarding-once",
            password: "test",
        });

        assert.isUndefined(user.onboardingCompletedAt);

        await completeOnboardingIfNeeded(user.id);
        await user.refresh();
        assert.isNotNull(user.onboardingCompletedAt);

        const firstValue = user.onboardingCompletedAt;
        await completeOnboardingIfNeeded(user.id);
        await user.refresh();
        assert.equal(user.onboardingCompletedAt?.toISO(), firstValue?.toISO());
    });

    test("terminateGame on training game completes onboarding for the human player", async ({
        assert,
    }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const human = await User.create({
            email: `onboarding-train-${unique}@test.fr`,
            password: "test",
        });

        const data = bindUserIds(
            createGameData({
                state: "PLAYER_ONE_TURN",
                isTraining: true,
                playerOne: { health: 0 },
                playerTwo: { health: 5 },
            }),
            human.id,
            TRAINING_AI_USER_ID,
        );

        const game = await Game.create({
            playerOneId: human.id,
            playerTwoId: null,
            data,
            isFinished: false,
        });

        assert.equal(getTrainingGameHumanUserId(game), human.id);

        await terminateGame(game);
        await human.refresh();

        assert.isNotNull(human.onboardingCompletedAt);
    });

    test("terminateGame on ranked game does not complete onboarding", async ({ assert }) => {
        const { game, playerOne, playerTwo } = await createTestGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                playerOne: { health: 0 },
                playerTwo: { health: 5 },
            }),
        );

        await terminateGame(game);
        await playerOne.refresh();
        await playerTwo.refresh();

        assert.isNull(playerOne.onboardingCompletedAt);
        assert.isNull(playerTwo.onboardingCompletedAt);
    });
});
