import { test } from "@japa/runner";
import { DEFAULT_HERO_HEALTH } from "#api_types/game.types";
import {
    createGameData,
    createMinionCard,
    createMinionState,
    placeMinion,
} from "../../helpers/game/fixtures.js";
import { runPlayCardInMemory } from "../../helpers/game/run_play_card_in_memory.js";
import {
    dynamicCostPerBoardMinion,
    dynamicCostPerHandCard,
    dynamicCostPerHeroMissingHealth,
} from "../../../database/seed_data/cards/define_card.js";

const createGiantCard = (dynamicCost: ReturnType<typeof dynamicCostPerHandCard>) =>
    createMinionCard({
        uuid: "giant",
        baseCost: 10,
        cost: 10,
        dynamicCost,
    });

test.group("dynamic cost play card", () => {
    test("giant costs 0 with 10 cards in hand and can be played with 0 mana", async ({
        assert,
    }) => {
        const giant = createGiantCard(dynamicCostPerHandCard());
        const fillers = Array.from({ length: 9 }, (_, index) =>
            createMinionCard({ uuid: `filler-${index}` }),
        );

        const { game, errors } = await runPlayCardInMemory(
            createGameData({
                playerOne: {
                    mana: 0,
                    hand: [giant, ...fillers],
                },
            }),
            "playerOne",
            { cardId: giant.uuid, boardIndex: 0, owner: "PLAYER" },
        );

        assert.deepEqual(errors, []);
        assert.isNotNull(game.data.playerOne.board[0]);
        assert.equal(game.data.playerOne.mana, 0);
    });

    test("giant cost is reduced by minions on both boards", async ({ assert }) => {
        const giant = createGiantCard(dynamicCostPerBoardMinion());
        const allyMinion = createMinionState(createMinionCard({ uuid: "ally" }));
        const enemyMinion = createMinionState(createMinionCard({ uuid: "enemy" }));

        const { game, errors } = await runPlayCardInMemory(
            createGameData({
                playerOne: {
                    mana: 8,
                    hand: [giant],
                    board: placeMinion(createGameData().playerOne.board, 0, allyMinion),
                },
                playerTwo: {
                    board: placeMinion(createGameData().playerTwo.board, 1, enemyMinion),
                },
            }),
            "playerOne",
            { cardId: giant.uuid, boardIndex: 1, owner: "PLAYER" },
        );

        assert.deepEqual(errors, []);
        assert.equal(game.data.playerOne.mana, 0);
        assert.equal(game.data.playerOne.board[1]!.originalCard.cost, 8);
    });

    test("giant cost is reduced by missing hero health", async ({ assert }) => {
        const giant = createGiantCard(dynamicCostPerHeroMissingHealth());

        const { game, errors } = await runPlayCardInMemory(
            createGameData({
                playerOne: {
                    mana: 0,
                    health: 20,
                    hand: [giant],
                },
            }),
            "playerOne",
            { cardId: giant.uuid, boardIndex: 0, owner: "PLAYER" },
        );

        assert.deepEqual(errors, []);
        assert.equal(game.data.playerOne.mana, 0);
        assert.equal(game.data.playerOne.board[0]!.originalCard.cost, 0);
        assert.equal(game.data.playerOne.health, 20);
        assert.equal(DEFAULT_HERO_HEALTH - game.data.playerOne.health, 10);
    });

    test("deducts effective cost not base cost", async ({ assert }) => {
        const giant = createGiantCard(dynamicCostPerHandCard());
        const fillers = Array.from({ length: 4 }, (_, index) =>
            createMinionCard({ uuid: `filler-${index}` }),
        );

        const { game, errors } = await runPlayCardInMemory(
            createGameData({
                playerOne: {
                    mana: 6,
                    hand: [giant, ...fillers],
                },
            }),
            "playerOne",
            { cardId: giant.uuid, boardIndex: 0, owner: "PLAYER" },
        );

        assert.deepEqual(errors, []);
        assert.equal(game.data.playerOne.mana, 1);
        assert.equal(game.data.playerOne.board[0]!.originalCard.cost, 5);
        assert.equal(game.data.playerOne.stats.manaSpent, 5);
    });
});
