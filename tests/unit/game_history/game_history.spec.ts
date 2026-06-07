import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import { listUserGames } from "#controllers/game_history/list_user_games";
import {
    getEloDelta,
    getGameResult,
    serializeGameHistoryEntry,
} from "#controllers/game_history/serialize_game_history";
import { showUserGame } from "#controllers/game_history/show_user_game";
import { applyGameResult } from "#services/elo";
import User from "#models/user";
import type { HttpContext } from "@adonisjs/core/http";
import { createTestGame } from "#tests/helpers/game/game_factory";
import { createGameData } from "#tests/helpers/game/fixtures";

const createMockContext = (params: Record<string, unknown>) => {
    let notFoundBody: unknown;

    const ctx = {
        params,
        response: {
            notFound: (body: unknown) => {
                notFoundBody = body;
                return body;
            },
        },
    } as unknown as HttpContext;

    return { ctx, getNotFoundBody: () => notFoundBody };
};

test.group("game history", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("list returns only finished games for the player", async ({ assert }) => {
        const {
            game: finishedGame,
            playerOne,
            playerTwo,
        } = await createTestGame(
            createGameData({
                state: "FINISHED",
                currentRound: 7,
                playerOne: { health: 0, pseudo: "snapshot-alice" },
                playerTwo: { health: 5, pseudo: "snapshot-bob" },
            }),
            { isFinished: true },
        );

        await playerOne.merge({ pseudo: "Alice" }).save();
        await playerTwo.merge({ pseudo: "Bob" }).save();

        await applyGameResult(finishedGame);
        finishedGame.isFinished = true;
        await finishedGame.save();

        await createTestGame(createGameData(), { isFinished: false });

        const { ctx } = createMockContext({ userId: playerOne.id });
        const result = await listUserGames(ctx);

        assert.equal(result.games.length, 1);
        assert.equal(result.games[0]!.gameId, finishedGame.id);
        assert.equal(result.games[0]!.opponentUserId, playerTwo.id);
        assert.equal(result.games[0]!.opponentPseudo, "Bob");
        assert.equal(result.games[0]!.result, "LOSS");
        assert.equal(result.games[0]!.roundCount, 7);
        assert.equal(result.user.userId, playerOne.id);
    });

    test("list returns 404 for unknown user", async ({ assert }) => {
        const { ctx, getNotFoundBody } = createMockContext({ userId: 999_999 });

        await listUserGames(ctx);

        assert.deepEqual(getNotFoundBody(), { error: "Utilisateur introuvable" });
    });

    test("serialize entry reports draw with null elo delta", async ({ assert }) => {
        const { game, playerOne } = await createTestGame(
            createGameData({
                state: "FINISHED",
                playerOne: { health: 0 },
                playerTwo: { health: 0 },
            }),
            { isFinished: true },
        );

        await applyGameResult(game);
        await game.save();

        const entry = serializeGameHistoryEntry(game, playerOne.id);

        assert.equal(entry.result, "DRAW");
        assert.equal(getGameResult(game, playerOne.id), "DRAW");
        assert.isNull(getEloDelta(game, playerOne.id));
        assert.isNull(entry.eloDelta);
    });

    test("show returns stats and rating result", async ({ assert }) => {
        const { game, playerOne, playerTwo } = await createTestGame(
            createGameData({
                state: "FINISHED",
                currentRound: 4,
                playerOne: {
                    health: 0,
                    pseudo: "Alice",
                    stats: {
                        manaSpent: 12,
                        minionsPlayed: 3,
                        spellsCast: 2,
                        weaponsPlayed: 1,
                        damageDealt: 20,
                        healingDone: 1,
                        cardsDrawn: 5,
                        heroAttacks: 2,
                    },
                },
                playerTwo: {
                    health: 3,
                    pseudo: "Bob",
                    stats: {
                        manaSpent: 10,
                        minionsPlayed: 2,
                        spellsCast: 1,
                        weaponsPlayed: 0,
                        damageDealt: 15,
                        healingDone: 0,
                        cardsDrawn: 4,
                        heroAttacks: 1,
                    },
                },
            }),
            { isFinished: true },
        );

        await applyGameResult(game);
        await game.save();

        await playerOne.merge({ pseudo: "Alice", elo: 1180, wins: 2, losses: 5 }).save();
        await playerTwo.merge({ pseudo: "Bob" }).save();

        const { ctx } = createMockContext({ userId: playerOne.id, gameId: game.id });
        const result = await showUserGame(ctx);

        assert.equal(result.gameId, game.id);
        assert.equal(result.result, "LOSS");
        assert.equal(result.winnerId, playerTwo.id);
        assert.equal(result.roundCount, 4);
        assert.equal(result.player.pseudo, "Alice");
        assert.equal(result.opponent.pseudo, "Bob");
        assert.equal(result.player.stats.damageDealt, 20);
        assert.equal(result.opponent.stats.damageDealt, 15);
        assert.exists(result.ratingResult);
        assert.exists(result.playerRating);
        assert.equal(result.playerRating!.delta, getEloDelta(game, playerOne.id));
    });

    test("show returns 404 when game is not finished", async ({ assert }) => {
        const { game, playerOne } = await createTestGame(createGameData(), { isFinished: false });
        const { ctx, getNotFoundBody } = createMockContext({
            userId: playerOne.id,
            gameId: game.id,
        });

        await showUserGame(ctx);

        assert.deepEqual(getNotFoundBody(), { error: "Partie introuvable" });
    });

    test("show returns 404 when user is not a participant", async ({ assert }) => {
        const { game } = await createTestGame(
            createGameData({
                state: "FINISHED",
                playerOne: { health: 0 },
                playerTwo: { health: 5 },
            }),
            { isFinished: true },
        );

        await applyGameResult(game);
        await game.save();

        const outsider = await User.create({
            email: `outsider-${Date.now()}@test.fr`,
            password: "test",
        });

        const { ctx, getNotFoundBody } = createMockContext({
            userId: outsider.id,
            gameId: game.id,
        });

        await showUserGame(ctx);

        assert.deepEqual(getNotFoundBody(), { error: "Partie introuvable" });
    });

    test("show returns 404 when route user did not participate in the game", async ({ assert }) => {
        const { game } = await createTestGame(
            createGameData({
                state: "FINISHED",
                playerOne: { health: 0 },
                playerTwo: { health: 5 },
            }),
            { isFinished: true },
        );

        await applyGameResult(game);
        await game.save();

        const unrelatedUser = await User.create({
            email: `unrelated-${Date.now()}@test.fr`,
            password: "test",
        });

        const { ctx, getNotFoundBody } = createMockContext({
            userId: unrelatedUser.id,
            gameId: game.id,
        });

        await showUserGame(ctx);

        assert.deepEqual(getNotFoundBody(), { error: "Partie introuvable" });
    });
});
