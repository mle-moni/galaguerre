import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import { getDefaultGameData } from "#controllers/games/create_game";
import { performMulliganOnPlayer } from "#controllers/games/mulligan/perform_mulligan";
import { syncCards } from "#database/seed_helpers/sync_cards";
import { GALADRIM_AGGRO_DECK_RECIPE } from "#database/seed_data/balanced_decks";
import { TRAINING_AI_PSEUDO, TRAINING_AI_USER_ID } from "#services/training/training_constants";
import { loadTrainingBotCards } from "#services/training/load_training_bot_cards";
import { createStarterDeckForUser } from "#services/decks/create_starter_deck_for_user";
import {
    ONBOARDING_HUMAN_OPENING_HAND_CARD_IDS,
} from "#services/onboarding/arrange_onboarding_tutorial_deck";
import User from "#models/user";

test.group("onboarding tutorial game setup", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("first training game deals a scripted opening hand to the human", async ({ assert }) => {
        await syncCards();

        const user = await User.create({
            email: "tutorial-deck@test.fr",
            pseudo: "tutorial-player",
            password: "test",
        });
        const deck = await createStarterDeckForUser(user.id);
        await deck.load("cards");
        const botCards = await loadTrainingBotCards();

        const data = getDefaultGameData({
            playerOne: {
                userId: user.id,
                pseudo: user.pseudo!,
                deck,
            },
            playerTwo: {
                userId: TRAINING_AI_USER_ID,
                pseudo: TRAINING_AI_PSEUDO,
                cards: botCards,
            },
            isTraining: true,
            isOnboardingTutorial: true,
        });

        assert.isTrue(data.isOnboardingTutorial);
        assert.deepEqual(
            data.playerOne.hand.map((card) => card.cardId),
            [...ONBOARDING_HUMAN_OPENING_HAND_CARD_IDS],
        );

        const expensiveCards = data.playerOne.hand.filter((card) =>
            [80, 101].includes(card.cardId),
        );
        performMulliganOnPlayer(
            data.playerOne,
            expensiveCards.map((card) => card.uuid),
        );

        assert.deepEqual(
            data.playerOne.hand.map((card) => card.cardId).sort((a, b) => a - b),
            [62, 76, 87],
        );

        const recipeCardIds = new Set(GALADRIM_AGGRO_DECK_RECIPE.map(({ cardId }) => cardId));
        for (const cardId of data.playerOne.hand.map((card) => card.cardId)) {
            assert.isTrue(recipeCardIds.has(cardId));
        }
    });
});
