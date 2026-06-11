import { test } from "@japa/runner";
import { generatePlayerCards } from "#controllers/games/generate_player_cards";
import {
    attackGreaterThan,
    boostAction,
    boostBoth,
    costEquals,
    damageAction,
    defaultMinionData,
    drawAction,
    enemyHero,
    minionDrawFilter,
    targetedAllyMinion,
    targetedEnemyMinionWithComparison,
} from "#database/seed_data/cards/define_card";
import { parseMinionData } from "#galaguerre/card_definition.schema";
import { createTestMinionCard } from "#tests/helpers/catalog_fixtures";

test.group("generatePlayerCards", () => {
    test("embeds battlecry actions from card data", ({ assert }) => {
        const card = createTestMinionCard({
            id: 101,
            label: "bc-card",
            data: {
                ...defaultMinionData(),
                battlecryActions: [damageAction(4, enemyHero())],
            },
        });

        const playerCards = generatePlayerCards([card]);
        const generated = playerCards.find((c) => c.cardId === card.id);

        assert.isDefined(generated);
        assert.equal(generated?.type, "MINION");
        if (!generated || generated.type !== "MINION") return;

        assert.equal(generated.battlecryActions.length, 1);
        assert.equal(generated.battlecryActions[0]!.type, "DAMAGE");
        assert.equal(generated.battlecryActions[0]!.damage, 4);
        assert.equal(generated.battlecryActions[0]!.isTargeted, false);
        assert.deepEqual(generated.battlecryActions[0]!.target, {
            type: "HERO",
            targetTeam: "OPPONENT",
            comparison: null,
            tag: null,
            excludeSelf: false,
            maxTargets: null,
            targetSelectionMode: null,
        });
        assert.include(generated.description, "Cri de guerre : Inflige 4 dégâts au héros adverse.");
    });

    test("embeds comparison from card data", ({ assert }) => {
        const card = createTestMinionCard({
            id: 102,
            label: "bc-comp-card",
            data: parseMinionData({
                ...defaultMinionData(),
                attack: 2,
                health: 2,
                battlecryActions: [
                    damageAction(3, targetedEnemyMinionWithComparison(attackGreaterThan(2)), true),
                ],
            }),
        });

        const playerCards = generatePlayerCards([card]);
        const generated = playerCards.find((c) => c.cardId === card.id);

        assert.isDefined(generated);
        assert.equal(generated?.type, "MINION");
        if (!generated || generated.type !== "MINION") return;

        assert.equal(generated.battlecryActions.length, 1);
        assert.equal(generated.battlecryActions[0]!.isTargeted, true);
        assert.deepEqual(generated.battlecryActions[0]!.target, {
            type: "MINION",
            targetTeam: "OPPONENT",
            comparison: {
                costComparison: null,
                cost: null,
                attackComparison: ">",
                attack: 2,
                healthComparison: null,
                health: null,
            },
            tag: null,
            excludeSelf: false,
            maxTargets: null,
            targetSelectionMode: null,
        });
        assert.include(
            generated.description,
            "Cri de guerre : Inflige 3 dégâts à un serviteur adverse attaque > 2.",
        );
    });

    test("embeds boost from card data", ({ assert }) => {
        const card = createTestMinionCard({
            id: 103,
            label: "bc-boost-card",
            data: parseMinionData({
                ...defaultMinionData(),
                attack: 2,
                health: 2,
                battlecryActions: [boostAction(boostBoth(2, 2), targetedAllyMinion(), true)],
            }),
        });

        const playerCards = generatePlayerCards([card]);
        const generated = playerCards.find((c) => c.cardId === card.id);

        assert.isDefined(generated);
        assert.equal(generated?.type, "MINION");
        if (!generated || generated.type !== "MINION") return;

        assert.equal(generated.battlecryActions.length, 1);
        assert.equal(generated.battlecryActions[0]!.type, "BOOST");
        assert.deepEqual(generated.battlecryActions[0]!.boost, {
            attack: 2,
            health: 2,
            spellPower: null,
            minionPower: null,
        });
        assert.include(generated.description, "Cri de guerre : Donne +2/+2 à un serviteur allié.");
    });

    test("embeds draw card filter from card data", ({ assert }) => {
        const card = createTestMinionCard({
            id: 104,
            label: "bc-draw-filter-card",
            data: parseMinionData({
                ...defaultMinionData(),
                battlecryActions: [drawAction(1, minionDrawFilter([], costEquals(2)))],
            }),
        });

        const playerCards = generatePlayerCards([card]);
        const generated = playerCards.find((c) => c.cardId === card.id);

        assert.isDefined(generated);
        assert.equal(generated?.type, "MINION");
        if (!generated || generated.type !== "MINION") return;

        assert.equal(generated.battlecryActions.length, 1);
        assert.equal(generated.battlecryActions[0]!.type, "DRAW");
        assert.equal(generated.battlecryActions[0]!.drawCount, 1);
        assert.deepEqual(generated.battlecryActions[0]!.drawCardFilter, {
            type: "MINION",
            comparison: {
                costComparison: "=",
                cost: 2,
                attackComparison: null,
                attack: null,
                healthComparison: null,
                health: null,
            },
            tags: [],
        });
        assert.include(generated.description, "Cri de guerre : Pioche 1 carte Monstre + coût = 2.");
    });
});
