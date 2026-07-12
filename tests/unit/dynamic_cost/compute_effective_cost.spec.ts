import { test } from "@japa/runner";
import { DEFAULT_HERO_HEALTH } from "#api_types/game.types";
import {
    computeEffectiveCost,
    clearNextSpellCostReduction,
    refreshHandDynamicCosts,
} from "#galaguerre/dynamic_cost/compute_effective_cost";
import {
    createGamePlayer,
    createMinionCard,
    createMinionState,
    createSpellCard,
    placeMinion,
} from "../../helpers/game/fixtures.js";
import type { DynamicCostDefinition } from "#galaguerre/card_definition.schema";
import {
    dynamicCostPerBoardMinion,
    dynamicCostPerHandCard,
    dynamicCostPerHeroMissingHealth,
} from "../../../database/seed_data/cards/define_card.js";

const createGiantCard = (
    dynamicCost: DynamicCostDefinition,
    overrides: Partial<ReturnType<typeof createMinionCard>> = {},
) =>
    createMinionCard({
        baseCost: 10,
        cost: 10,
        dynamicCost,
        ...overrides,
    });

test.group("computeEffectiveCost", () => {
    test("reduces cost by one per card in hand", ({ assert }) => {
        const giant = createGiantCard(dynamicCostPerHandCard());
        const filler = createMinionCard({ uuid: "filler" });
        const player = createGamePlayer(1, {
            hand: [giant, filler, filler, filler],
        });
        const opponent = createGamePlayer(2);

        assert.equal(computeEffectiveCost(giant, player, opponent), 6);
    });

    test("counts the evaluated card itself in hand size", ({ assert }) => {
        const giant = createGiantCard(dynamicCostPerHandCard(), { uuid: "giant" });
        const player = createGamePlayer(1, { hand: [giant] });
        const opponent = createGamePlayer(2);

        assert.equal(computeEffectiveCost(giant, player, opponent), 9);
    });

    test("reduces cost by one per minion on both boards", ({ assert }) => {
        const giant = createGiantCard(dynamicCostPerBoardMinion());
        const minion = createMinionState(createMinionCard({ uuid: "board-minion" }));
        const player = createGamePlayer(1, {
            hand: [giant],
            board: placeMinion(createGamePlayer(1).board, 0, minion),
        });
        const opponent = createGamePlayer(2, {
            board: placeMinion(
                createGamePlayer(2).board,
                1,
                createMinionState(createMinionCard({ uuid: "enemy-minion" })),
            ),
        });

        assert.equal(computeEffectiveCost(giant, player, opponent), 8);
    });

    test("reduces cost by one per missing hero health point", ({ assert }) => {
        const giant = createGiantCard(dynamicCostPerHeroMissingHealth());
        const player = createGamePlayer(1, {
            hand: [giant],
            health: 20,
        });
        const opponent = createGamePlayer(2);

        assert.equal(computeEffectiveCost(giant, player, opponent), 0);
    });

    test("stacks multiple reductions and floors at zero", ({ assert }) => {
        const giant = createGiantCard({
            reductions: [
                { source: "HAND_CARD_COUNT", amountPer: 1 },
                { source: "BOARD_MINION_COUNT", amountPer: 1 },
                { source: "HERO_MISSING_HEALTH", amountPer: 1 },
            ],
        });
        const player = createGamePlayer(1, {
            hand: [giant, createMinionCard({ uuid: "filler" })],
            health: DEFAULT_HERO_HEALTH - 5,
            board: placeMinion(
                createGamePlayer(1).board,
                0,
                createMinionState(createMinionCard({ uuid: "ally" })),
            ),
        });
        const opponent = createGamePlayer(2);

        assert.equal(computeEffectiveCost(giant, player, opponent), 2);
    });

    test("refreshHandDynamicCosts updates card.cost in hand", ({ assert }) => {
        const giant = createGiantCard(dynamicCostPerHandCard(), { uuid: "giant" });
        const player = createGamePlayer(1, {
            hand: [giant, createMinionCard({ uuid: "filler" })],
        });
        const opponent = createGamePlayer(2);

        refreshHandDynamicCosts(player, opponent);

        assert.equal(giant.cost, 8);
    });

    test("returns base cost when dynamicCost is null", ({ assert }) => {
        const card = createMinionCard({ baseCost: 3, cost: 3, dynamicCost: null });
        const player = createGamePlayer(1, { hand: [card] });
        const opponent = createGamePlayer(2);

        assert.equal(computeEffectiveCost(card, player, opponent), 3);
    });

    test("applies hand cost reduction without dynamic cost", ({ assert }) => {
        const card = createMinionCard({
            baseCost: 4,
            cost: 4,
            handCostReduction: 2,
            dynamicCost: null,
        });
        const player = createGamePlayer(1, { hand: [card] });
        const opponent = createGamePlayer(2);

        assert.equal(computeEffectiveCost(card, player, opponent), 2);
    });

    test("refreshes hand cost reduction in hand", ({ assert }) => {
        const card = createMinionCard({
            uuid: "reverted-minion",
            baseCost: 4,
            cost: 4,
            handCostReduction: 2,
            dynamicCost: null,
        });
        const player = createGamePlayer(1, { hand: [card] });
        const opponent = createGamePlayer(2);

        refreshHandDynamicCosts(player, opponent);

        assert.equal(card.cost, 2);
    });

    test("restores spell costs after nextSpellCostReduction is cleared", ({ assert }) => {
        const discountedSpell = createSpellCard({
            uuid: "discounted-spell",
            baseCost: 2,
            cost: 0,
        });
        const otherSpell = createSpellCard({
            uuid: "other-spell",
            baseCost: 4,
            cost: 2,
        });
        const player = createGamePlayer(1, {
            hand: [discountedSpell, otherSpell],
            nextSpellCostReduction: 2,
        });
        const opponent = createGamePlayer(2);

        clearNextSpellCostReduction(player);
        refreshHandDynamicCosts(player, opponent);

        assert.equal(discountedSpell.cost, 2);
        assert.equal(otherSpell.cost, 4);
    });
});
