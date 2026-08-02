import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import type { HttpContext } from "@adonisjs/core/http";
import { DateTime } from "luxon";
import { createTrainingGame } from "#controllers/games/create_training_game";
import { createTrainingGameSchema } from "#controllers/games/game_validators";
import { parseMinionData } from "#galaguerre/card_definition.schema";
import Card from "#models/card";
import Deck from "#models/deck";
import DeckCard from "#models/deck_card";
import Game from "#models/game";
import User from "#models/user";
import { TRAINING_AI_PSEUDOS, TRAINING_AI_USER_ID } from "#services/training/training_constants";
import { syncCards } from "#database/seed_helpers/sync_cards";
import { defaultMinionData } from "#database/seed_data/cards/define_card";
import { ADVANCED_AI_DECKS } from "#database/seed_data/ai_decks";
import { TRAINING_BOT_DECK_RECIPE } from "#database/seed_data/training_bot_deck";
import { buildDeckCardIds, GALADRIM_AGGRO_DECK_RECIPE } from "#database/seed_data/balanced_decks";
import { createDeckFromRecipe } from "#services/decks/create_deck_from_recipe";
import { getActiveCardSetId } from "#tests/helpers/card_set";

const createContext = (user: User) =>
    ({
        auth: { user },
        response: {
            badRequest: (payload: unknown) => payload,
            notFound: (payload: unknown) => payload,
        },
    }) as unknown as HttpContext;

const createUser = async (prefix: string, onboarded = true) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const user = await User.create({
        email: `${prefix}-${unique}@test.fr`,
        password: "test",
    });

    if (onboarded) {
        user.onboardingCompletedAt = DateTime.now();
        await user.save();
    }

    return user;
};

const createValidDeckForUser = async (userId: number, labelPrefix: string) => {
    const deck = await Deck.create({
        name: `Difficulty deck ${labelPrefix}`,
        userId,
        selected: true,
    });

    for (let index = 0; index < 15; index++) {
        const card = await Card.create({
            cardSetId: await getActiveCardSetId(),
            data: parseMinionData({
                ...defaultMinionData(),
                name: `${labelPrefix}-card-${index}`,
            }),
            isCollectible: true,
        });

        await DeckCard.create({ deckId: deck.id, cardId: card.id });
        await DeckCard.create({ deckId: deck.id, cardId: card.id });
    }

    return deck;
};

/** Cartes du bot, quel que soit le siège qu'il occupe. */
const aiDeckCardIds = (game: Game): number[] => {
    const ai =
        game.data.playerOne.userId === TRAINING_AI_USER_ID
            ? game.data.playerOne
            : game.data.playerTwo;

    return [...ai.deckCards, ...ai.hand].map((card) => card.cardId).sort((a, b) => a - b);
};

const sortedIds = (cardIds: number[]): number[] => [...cardIds].sort((a, b) => a - b);

/** Pseudo affiché pour le bot, quel que soit le siège qu'il occupe. */
const aiPseudo = (game: Game): string =>
    game.data.playerOne.userId === TRAINING_AI_USER_ID
        ? game.data.playerOne.pseudo
        : game.data.playerTwo.pseudo;

test.group("training:difficulty", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("defaults to BEGINNER when no difficulty is sent", async ({ assert }) => {
        await syncCards();
        const user = await createUser("default-difficulty");
        await createValidDeckForUser(user.id, "default-difficulty");

        const result = (await createTrainingGame(createContext(user))) as { gameId: number };
        const game = await Game.findOrFail(result.gameId);

        assert.equal(game.data.aiDifficulty, "BEGINNER");
        assert.isUndefined(game.data.aiDeckProfile);
        assert.equal(aiPseudo(game), TRAINING_AI_PSEUDOS.BEGINNER);
        assert.deepEqual(
            aiDeckCardIds(game),
            sortedIds(buildDeckCardIds(TRAINING_BOT_DECK_RECIPE)),
        );
    });

    test("ADVANCED picks one of the two advanced decks and records its profile", async ({
        assert,
    }) => {
        await syncCards();
        const user = await createUser("advanced-difficulty");
        await createValidDeckForUser(user.id, "advanced-difficulty");

        const result = (await createTrainingGame(createContext(user), "ADVANCED")) as {
            gameId: number;
        };
        const game = await Game.findOrFail(result.gameId);

        assert.equal(game.data.aiDifficulty, "ADVANCED");
        assert.oneOf(game.data.aiDeckProfile, ["AGGRO", "MIDRANGE"]);
        assert.equal(aiPseudo(game), TRAINING_AI_PSEUDOS.ADVANCED);

        const expectedDeck = ADVANCED_AI_DECKS.find(
            ({ profile }) => profile === game.data.aiDeckProfile,
        )!;
        assert.deepEqual(aiDeckCardIds(game), sortedIds(buildDeckCardIds(expectedDeck.recipe)));
    });

    test("the onboarding tutorial forces BEGINNER and its historical deck", async ({ assert }) => {
        await syncCards();
        // Le tutoriel s'appuie sur la main de départ exacte des DEUX joueurs : le deck humain
        // doit donc être un vrai deck de départ, pas un deck synthétique.
        const user = await createUser("tutorial-difficulty", false);
        await createDeckFromRecipe({
            userId: user.id,
            name: "Deck de départ",
            recipe: GALADRIM_AGGRO_DECK_RECIPE,
            selected: true,
        });

        const result = (await createTrainingGame(createContext(user), "ADVANCED")) as {
            gameId: number;
        };
        const game = await Game.findOrFail(result.gameId);

        assert.isTrue(game.data.isOnboardingTutorial);
        assert.equal(game.data.aiDifficulty, "BEGINNER");
        assert.isUndefined(game.data.aiDeckProfile);
        assert.equal(aiPseudo(game), TRAINING_AI_PSEUDOS.BEGINNER);
        assert.deepEqual(
            aiDeckCardIds(game),
            sortedIds(buildDeckCardIds(TRAINING_BOT_DECK_RECIPE)),
        );
    });

    test("the route validator rejects an unknown difficulty", async ({ assert }) => {
        await assert.rejects(() => createTrainingGameSchema.validate({ difficulty: "IMPOSSIBLE" }));
    });

    test("the route validator accepts both difficulties and an empty body", async ({ assert }) => {
        assert.deepEqual(await createTrainingGameSchema.validate({}), {});
        assert.deepEqual(await createTrainingGameSchema.validate({ difficulty: "BEGINNER" }), {
            difficulty: "BEGINNER",
        });
        assert.deepEqual(await createTrainingGameSchema.validate({ difficulty: "ADVANCED" }), {
            difficulty: "ADVANCED",
        });
    });
});
