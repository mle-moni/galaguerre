import { test } from "@japa/runner";
import {
    computeEffectiveCost,
    refreshHandDynamicCosts,
} from "#galaguerre/dynamic_cost/compute_effective_cost";
import {
    dynamicCostPerBoardMinion,
    dynamicCostPerHandCard,
} from "#database/seed_data/cards/define_card";
import {
    createEmptyBoard,
    createGameData,
    createGamePlayer,
    createMinionCard,
    createMinionState,
    placeMinion,
} from "../../helpers/game/fixtures.js";
import { runPlayCardInMemory } from "../../helpers/game/run_play_card_in_memory.js";

const createSeaGiant = (overrides: Partial<ReturnType<typeof createMinionCard>> = {}) =>
    createMinionCard({
        uuid: "sea-giant",
        baseCost: 10,
        cost: 10,
        dynamicCost: dynamicCostPerBoardMinion(),
        ...overrides,
    });

const createMountainGiant = (overrides: Partial<ReturnType<typeof createMinionCard>> = {}) =>
    createMinionCard({
        uuid: "mountain-giant",
        baseCost: 10,
        cost: 10,
        dynamicCost: dynamicCostPerHandCard(),
        ...overrides,
    });

const placeBoardMinions = (count: number) => {
    let board = createEmptyBoard();

    for (let index = 0; index < count; index++) {
        board = placeMinion(
            board,
            index,
            createMinionState(createMinionCard({ uuid: `board-minion-${index}` })),
        );
    }

    return board;
};

test.group("giant hand cost reduction (Hearthstone-style)", () => {
    test("sea giant stacks board reduction with git revert hand reduction", ({ assert }) => {
        const giant = createSeaGiant({ handCostReduction: 2 });
        const player = createGamePlayer(1, {
            hand: [giant],
            board: placeBoardMinions(4),
        });
        const opponent = createGamePlayer(2);

        assert.equal(computeEffectiveCost(giant, player, opponent), 4);
    });

    test("mountain giant stacks hand size reduction with git revert hand reduction", ({
        assert,
    }) => {
        const giant = createMountainGiant({ handCostReduction: 2 });
        const filler = createMinionCard({ uuid: "filler-1" });
        const player = createGamePlayer(1, {
            hand: [giant, filler, filler, filler],
        });
        const opponent = createGamePlayer(2);

        assert.equal(computeEffectiveCost(giant, player, opponent), 4);
    });

    test("never goes below zero when reductions exceed base cost", ({ assert }) => {
        const giant = createSeaGiant({ handCostReduction: 2 });
        const player = createGamePlayer(1, {
            hand: [giant],
            board: placeBoardMinions(10),
        });
        const opponent = createGamePlayer(2);

        assert.equal(computeEffectiveCost(giant, player, opponent), 0);
    });

    test("keeps cost at zero when giant was already free before git revert", ({ assert }) => {
        const giant = createSeaGiant({ handCostReduction: 2 });
        const player = createGamePlayer(1, {
            hand: [giant],
            board: placeBoardMinions(9),
        });
        const opponent = createGamePlayer(2);

        assert.equal(computeEffectiveCost(giant, player, opponent), 0);
    });

    test("updates sea giant cost when board minions change after return to hand", ({ assert }) => {
        const giant = createSeaGiant({ handCostReduction: 2 });
        const ally = createMinionState(createMinionCard({ uuid: "ally" }));
        const player = createGamePlayer(1, {
            hand: [giant],
            board: placeMinion(createGamePlayer(1).board, 0, ally),
        });
        const opponent = createGamePlayer(2, {
            board: placeBoardMinions(3),
        });

        refreshHandDynamicCosts(player, opponent);
        assert.equal(giant.cost, 4);

        opponent.board.pop();
        refreshHandDynamicCosts(player, opponent);
        assert.equal(giant.cost, 5);
    });

    test("updates mountain giant cost when hand size changes after return to hand", ({
        assert,
    }) => {
        const giant = createMountainGiant({ handCostReduction: 2 });
        const filler = createMinionCard({ uuid: "filler" });
        const player = createGamePlayer(1, {
            hand: [giant, filler],
        });
        const opponent = createGamePlayer(2);

        refreshHandDynamicCosts(player, opponent);
        assert.equal(giant.cost, 6);

        player.hand.push(createMinionCard({ uuid: "drawn-card" }));
        refreshHandDynamicCosts(player, opponent);
        assert.equal(giant.cost, 5);
    });

    test("preserves printed base cost after git revert", ({ assert }) => {
        const giant = createSeaGiant({ handCostReduction: 2 });
        const player = createGamePlayer(1, {
            hand: [giant],
            board: placeBoardMinions(4),
        });
        const opponent = createGamePlayer(2);

        refreshHandDynamicCosts(player, opponent);

        assert.equal(giant.baseCost, 10);
        assert.equal(giant.handCostReduction, 2);
        assert.equal(giant.cost, 4);
    });

    test("playing a minion clears hand cost reduction from its board copy", async ({ assert }) => {
        const minion = createMinionCard({
            uuid: "discounted-minion",
            baseCost: 5,
            cost: 3,
            handCostReduction: 2,
        });

        const { game, errors } = await runPlayCardInMemory(
            createGameData({
                playerOne: { mana: 10, hand: [minion] },
            }),
            "playerOne",
            { cardId: minion.uuid, boardIndex: 0, owner: "PLAYER" },
        );

        assert.deepEqual(errors, []);
        assert.isUndefined(game.data.playerOne.board[0]!.originalCard.handCostReduction);
    });
});
