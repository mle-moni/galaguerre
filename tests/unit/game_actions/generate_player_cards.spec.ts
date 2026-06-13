import { test } from "@japa/runner";
import { generatePlayerCards } from "#controllers/games/generate_player_cards";
import {
    attackGreaterThan,
    boostAction,
    boostBoth,
    costEquals,
    damageAction,
    defaultMinionData,
    defaultSpellData,
    drawAction,
    enemyHero,
    minionDrawFilter,
    silenceAction,
    targetedAllyMinion,
    targetedAnyMinion,
    targetedEnemyMinionWithComparison,
} from "#database/seed_data/cards/define_card";
import { parseMinionData, parseSpellData } from "#galaguerre/card_definition.schema";
import { createTestCard, createTestMinionCard } from "#tests/helpers/catalog_fixtures";

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

    test("embeds spell actions from card data", ({ assert }) => {
        const card = createTestCard({
            id: 201,
            label: "spell-card",
            data: parseSpellData({
                ...defaultSpellData(),
                spellActions: [damageAction(4, enemyHero())],
            }),
        });

        const playerCards = generatePlayerCards([card]);
        const generated = playerCards.find((c) => c.cardId === card.id);

        assert.isDefined(generated);
        assert.equal(generated?.type, "SPELL");
        if (!generated || generated.type !== "SPELL") return;

        assert.equal(generated.spellActions.length, 1);
        assert.equal(generated.spellActions[0]!.type, "DAMAGE");
        assert.equal(generated.spellActions[0]!.damage, 4);
        assert.include(generated.description, "Effet : Inflige 4 dégâts au héros adverse.");
    });

    test("embeds multi-effect spell description on separate lines", ({ assert }) => {
        const card = createTestCard({
            id: 202,
            label: "earth-shock",
            data: parseSpellData({
                ...defaultSpellData(),
                spellActions: [
                    silenceAction(targetedAnyMinion(), true),
                    damageAction(1, targetedAnyMinion(), true),
                ],
            }),
        });

        const playerCards = generatePlayerCards([card]);
        const generated = playerCards.find((c) => c.cardId === card.id);

        assert.isDefined(generated);
        assert.equal(generated?.type, "SPELL");
        if (!generated || generated.type !== "SPELL") return;

        assert.equal(generated.spellActions.length, 2);
        assert.include(generated.description, "Effet :");
        assert.include(generated.description, "\n");
    });
});
