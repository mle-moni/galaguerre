import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import { getDefaultGameData } from "#controllers/games/create_game";
import { confirmAiMulliganIfNeeded } from "../../../app/galaguerre/ai/schedule_ai_mulligan.js";
import { clearAllGameTimers } from "../../../app/galaguerre/timers/game_timers.js";
import { runMulliganOnGame } from "#tests/helpers/game/run_mulligan";
import { terminateGame } from "#controllers/games/terminate_game";
import { enumerateAiMoves } from "../../../app/galaguerre/ai/enumerate_ai_moves.js";
import { runAiTurn, setAiActionDelayForTests } from "../../../app/galaguerre/ai/run_ai_turn.js";
import { tryAiAction, withAiSocket } from "../../../app/galaguerre/ai/try_ai_action.js";
import { parseMinionData } from "#galaguerre/card_definition.schema";
import Card from "#models/card";
import Deck from "#models/deck";
import DeckCard from "#models/deck_card";
import Game from "#models/game";
import User from "#models/user";
import { TRAINING_AI_PSEUDO, TRAINING_AI_USER_ID } from "#services/training/training_constants";
import { getActiveCardSetId } from "#tests/helpers/card_set";
import { bindUserIds, createTestGame } from "#tests/helpers/game/game_factory";
import {
    createGameData,
    createMinionCard,
    createMinionState,
    placeMinion,
} from "#tests/helpers/game/fixtures";
import { defaultMinionData } from "#database/seed_data/cards/define_card";
test.group("training:ai", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    group.each.setup(() => {
        setAiActionDelayForTests(0);
    });

    const createDeckForUser = async (userId: number, labelPrefix: string) => {
        const deck = await Deck.create({
            name: `Training deck ${labelPrefix}`,
            userId,
            selected: true,
        });

        for (let index = 0; index < 6; index++) {
            const card = await Card.create({
                cardSetId: await getActiveCardSetId(),
                data: parseMinionData({
                    ...defaultMinionData(),
                    name: `${labelPrefix}-card-${index}`,
                }),
            });

            await DeckCard.create({
                deckId: deck.id,
                cardId: card.id,
            });
        }

        await deck.load("cards");

        return deck;
    };

    test("confirmAiMulliganIfNeeded auto-confirms AI mulligan for training games", async ({
        assert,
    }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const human = await User.create({
            email: `train-mul-${unique}@test.fr`,
            password: "test",
        });
        const deck = await createDeckForUser(human.id, "train-mul");

        const data = getDefaultGameData({
            playerOne: { userId: human.id, pseudo: "Human", deck },
            playerTwo: {
                userId: TRAINING_AI_USER_ID,
                pseudo: TRAINING_AI_PSEUDO,
                cards: deck.cards,
            },
            isTraining: true,
        });

        const game = await Game.create({
            playerOneId: human.id,
            playerTwoId: null,
            data,
            isFinished: false,
        });

        await confirmAiMulliganIfNeeded(game);
        await game.refresh();

        assert.equal(game.data.state, "MULLIGAN");
        assert.isTrue(game.data.mulligan?.playerTwoDone);
        assert.isFalse(game.data.mulligan?.playerOneDone);

        clearAllGameTimers(game.id);
    });

    test("human mulligan starts game immediately after AI auto-confirms", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const human = await User.create({
            email: `train-mul-flow-${unique}@test.fr`,
            password: "test",
        });
        const deck = await createDeckForUser(human.id, "train-mul-flow");

        const data = getDefaultGameData({
            playerOne: { userId: human.id, pseudo: "Human", deck },
            playerTwo: {
                userId: TRAINING_AI_USER_ID,
                pseudo: TRAINING_AI_PSEUDO,
                cards: deck.cards,
            },
            isTraining: true,
        });

        const game = await Game.create({
            playerOneId: human.id,
            playerTwoId: null,
            data,
            isFinished: false,
        });

        await confirmAiMulliganIfNeeded(game);
        await game.refresh();

        const result = await runMulliganOnGame(game, human.id, []);

        assert.equal(result.game.data.state, "PLAYER_ONE_TURN");
        assert.isUndefined(result.game.data.mulligan);
    });

    test("getDefaultGameData sets isTraining when requested", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const human = await User.create({
            email: `train-p1-${unique}@test.fr`,
            password: "test",
        });
        const deck = await createDeckForUser(human.id, "train");

        const data = getDefaultGameData({
            playerOne: { userId: human.id, pseudo: "Human", deck },
            playerTwo: {
                userId: TRAINING_AI_USER_ID,
                pseudo: TRAINING_AI_PSEUDO,
                cards: deck.cards,
            },
            isTraining: true,
        });

        assert.isTrue(data.isTraining);
        assert.equal(data.playerTwo.userId, TRAINING_AI_USER_ID);
        assert.notEqual(
            data.playerOne.hand.map((card) => card.uuid).join(","),
            data.playerTwo.hand.map((card) => card.uuid).join(","),
        );
    });

    test("enumerateAiMoves respects taunt and mana", async ({ assert }) => {
        const tauntCard = createMinionCard({
            uuid: "taunt-card",
            hasTaunt: true,
            attack: 2,
            health: 3,
        });
        const attackerCard = createMinionCard({
            uuid: "attacker-card",
            attack: 3,
            hasCharge: true,
        });

        const { game, playerTwo } = await createTestGame(
            createGameData({
                state: "PLAYER_TWO_TURN",
                currentRound: 3,
                isTraining: true,
                playerTwo: {
                    mana: 0,
                    hand: [createMinionCard({ uuid: "too-expensive", cost: 10 })],
                    board: placeMinion(
                        createEmptyBoardFromFixture(),
                        "SPOT_1",
                        createMinionState(attackerCard, {
                            uuid: "attacker-minion",
                            placedAtRound: 3,
                        }),
                    ),
                },
                playerOne: {
                    board: placeMinion(
                        createEmptyBoardFromFixture(),
                        "SPOT_2",
                        createMinionState(tauntCard, { uuid: "taunt-minion" }),
                    ),
                },
            }),
        );

        const moves = enumerateAiMoves(game, playerTwo.id);
        const minionAttacks = moves.filter((move) => move.type === "minion_action");
        const playCards = moves.filter((move) => move.type === "play_card");

        assert.equal(playCards.length, 0);
        assert.isAbove(minionAttacks.length, 0);
        assert.isTrue(
            minionAttacks.every(
                (move) =>
                    move.type === "minion_action" &&
                    move.action.spotId === "SPOT_2" &&
                    move.action.owner === "OPPONENT",
            ),
        );
    });

    test("tryAiAction falls back when action is invalid", async ({ assert }) => {
        const { game } = await createTestGame(
            createGameData({
                state: "PLAYER_TWO_TURN",
                currentRound: 2,
                isTraining: true,
                playerTwo: {
                    mana: 10,
                    hand: [],
                    board: createEmptyBoardFromFixture(),
                },
            }),
        );

        await game
            .merge({
                data: bindUserIds(game.data, game.data.playerOne.userId, TRAINING_AI_USER_ID),
                playerTwoId: null,
            })
            .save();

        await withAiSocket(game.id, TRAINING_AI_USER_ID, async (socketId) => {
            const invalidPlay = await tryAiAction(game, socketId, {
                type: "play_card",
                action: {
                    cardId: "missing-card",
                    spotId: "SPOT_1",
                    owner: "PLAYER",
                },
            });

            assert.isFalse(invalidPlay);

            const passTurn = await tryAiAction(game, socketId, { type: "pass_turn" });
            assert.isTrue(passTurn);
        });

        await game.refresh();
        assert.equal(game.data.state, "PLAYER_ONE_TURN");
    });

    test("runAiTurn completes AI turn without blocking", async ({ assert }) => {
        const playableCard = createMinionCard({ uuid: "ai-hand-card", cost: 1 });

        const { game } = await createTestGame(
            createGameData({
                state: "PLAYER_TWO_TURN",
                currentRound: 2,
                isTraining: true,
                playerTwo: {
                    mana: 2,
                    hand: [playableCard],
                    board: createEmptyBoardFromFixture(),
                },
            }),
        );

        await game
            .merge({
                data: bindUserIds(game.data, game.data.playerOne.userId, TRAINING_AI_USER_ID),
                playerTwoId: null,
            })
            .save();

        await runAiTurn(game.id, TRAINING_AI_USER_ID);
        await game.refresh();

        assert.equal(game.data.state, "PLAYER_ONE_TURN");
    });

    test("runAiTurn acts on the correct game when bot has multiple active games", async ({
        assert,
    }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const humanA = await User.create({
            email: `train-a-${unique}@test.fr`,
            password: "test",
        });
        const humanB = await User.create({
            email: `train-b-${unique}@test.fr`,
            password: "test",
        });

        const playableCard = createMinionCard({ uuid: "concurrent-ai-card", cost: 1 });

        const gameAData = bindUserIds(
            createGameData({
                state: "PLAYER_TWO_TURN",
                currentRound: 2,
                isTraining: true,
                playerTwo: {
                    mana: 2,
                    hand: [playableCard],
                    board: createEmptyBoardFromFixture(),
                },
            }),
            humanA.id,
            TRAINING_AI_USER_ID,
        );

        const gameBData = bindUserIds(
            createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 3,
                isTraining: true,
                playerOne: { mana: 5 },
                playerTwo: { mana: 0, hand: [] },
            }),
            humanB.id,
            TRAINING_AI_USER_ID,
        );

        const gameA = await Game.create({
            playerOneId: humanA.id,
            playerTwoId: null,
            data: gameAData,
            isFinished: false,
        });

        const gameB = await Game.create({
            playerOneId: humanB.id,
            playerTwoId: null,
            data: gameBData,
            isFinished: false,
        });

        await runAiTurn(gameA.id, TRAINING_AI_USER_ID);

        await gameA.refresh();
        await gameB.refresh();

        assert.equal(gameA.data.state, "PLAYER_ONE_TURN");
        assert.equal(gameB.data.state, "PLAYER_ONE_TURN");
        assert.equal(gameB.data.currentRound, 3);
        assert.equal(gameB.data.playerOne.mana, 5);
    });

    test("terminateGame on training game skips Elo", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const human = await User.create({
            email: `train-end-p1-${unique}@test.fr`,
            password: "test",
            elo: 1200,
            wins: 0,
            losses: 0,
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

        await terminateGame(game);
        await game.refresh();
        await human.refresh();

        assert.isTrue(game.isFinished);
        assert.isNull(game.winnerId);
        assert.isUndefined(game.data.ratingResult);
        assert.equal(human.elo, 1200);
        assert.equal(human.wins, 0);
        assert.equal(human.losses, 0);
    });
});

const createEmptyBoardFromFixture = () => ({
    SPOT_1: null,
    SPOT_2: null,
    SPOT_3: null,
    SPOT_4: null,
    SPOT_5: null,
});
