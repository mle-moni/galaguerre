import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import { executeAction } from "../../../app/galaguerre/action_engine/execute_action.js";
import { drawOneCard } from "../../../app/galaguerre/draw_cards.js";
import {
    CARD_IDS,
    createCardActionSnapshot,
    createGameData,
    createHeroTargetSnapshot,
    createMinionCard,
    createMinionState,
    createMinionTargetSnapshot,
    createSpellCard,
    createWeaponCard,
    createWeaponState,
    MINION_IDS,
    placeMinion,
} from "#tests/helpers/game/fixtures";
import { createTestGame } from "#tests/helpers/game/game_factory";
import { runMinionAction } from "#tests/helpers/game/run_minion_action";
import { runPlayCard } from "#tests/helpers/game/run_play_card";
import { runWeaponAction } from "#tests/helpers/game/run_weapon_action";

test.group("player stats", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("tracks mana spent and minion played", async ({ assert }) => {
        const handCard = createMinionCard({ uuid: CARD_IDS.handMinion, cost: 4 });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: { mana: 10, hand: [handCard] },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
            },
            expect: { error: null },
        });

        assert.equal(result.game.data.playerOne.stats.manaSpent, 4);
        assert.equal(result.game.data.playerOne.stats.minionsPlayed, 1);
    });

    test("tracks mana spent and spell cast", async ({ assert }) => {
        const spell = createSpellCard({ uuid: CARD_IDS.spell, cost: 2 });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: { mana: 10, hand: [spell] },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.spell,
                spotId: null,
                owner: "PLAYER",
            },
            expect: { error: null },
        });

        assert.equal(result.game.data.playerOne.stats.manaSpent, 2);
        assert.equal(result.game.data.playerOne.stats.spellsCast, 1);
    });

    test("tracks mana spent and weapon played", async ({ assert }) => {
        const weapon = createWeaponCard({ uuid: CARD_IDS.weapon, cost: 3 });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: { mana: 10, hand: [weapon] },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.weapon,
                spotId: null,
                owner: "PLAYER",
            },
            expect: { error: null },
        });

        assert.equal(result.game.data.playerOne.stats.manaSpent, 3);
        assert.equal(result.game.data.playerOne.stats.weaponsPlayed, 1);
    });

    test("tracks spell damage to opponent hero", async ({ assert }) => {
        const spell = createSpellCard({
            uuid: CARD_IDS.spell,
            cost: 2,
            spellActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 5,
                    target: createHeroTargetSnapshot("OPPONENT"),
                }),
            ],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: { mana: 10, hand: [spell] },
                playerTwo: { health: 20 },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.spell,
                spotId: null,
                owner: "PLAYER",
            },
            expect: { error: null },
        });

        assert.equal(result.game.data.playerOne.stats.damageDealt, 5);
    });

    test("tracks spell healing on own hero", async ({ assert }) => {
        const spell = createSpellCard({
            uuid: CARD_IDS.spell,
            cost: 2,
            spellActions: [
                createCardActionSnapshot({
                    type: "HEAL",
                    heal: 4,
                    target: createHeroTargetSnapshot("PLAYER"),
                }),
            ],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: { mana: 10, health: 10, hand: [spell] },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.spell,
                spotId: null,
                owner: "PLAYER",
            },
            expect: { error: null },
        });

        assert.equal(result.game.data.playerOne.stats.healingDone, 4);
    });

    test("tracks minion combat damage for attacker and retaliation", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 4,
            health: 5,
        });
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 2,
            health: 6,
        });

        const result = await runMinionAction({
            data: createGameData({
                currentRound: 5,
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        "SPOT_1",
                        createMinionState(attackerCard, {
                            placedAtRound: 1,
                            lastActionAtRound: 0,
                            attacksThisRound: 0,
                        }),
                    ),
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        "SPOT_1",
                        createMinionState(targetCard),
                    ),
                },
            }),
            actor: "playerOne",
            action: {
                minionId: MINION_IDS.attacker,
                spotId: "SPOT_1",
                owner: "OPPONENT",
            },
            expect: { error: null },
        });

        assert.equal(result.game.data.playerOne.stats.damageDealt, 4);
        assert.equal(result.game.data.playerTwo.stats.damageDealt, 2);
    });

    test("tracks card draw but not fatigue damage", async ({ assert }) => {
        const data = createGameData({
            playerOne: {
                deckCards: [createMinionCard({ uuid: "deck-card-1" })],
            },
        });

        drawOneCard(data.playerOne);
        assert.equal(data.playerOne.stats.cardsDrawn, 1);

        drawOneCard(data.playerOne);
        assert.equal(data.playerOne.stats.cardsDrawn, 1);
        assert.equal(data.playerOne.stats.damageDealt, 0);
        assert.equal(data.playerOne.maxFatigueDamageTaken, 1);
    });

    test("tracks hero weapon attack damage and hero attacks", async ({ assert }) => {
        const weaponCard = createWeaponCard({ damage: 4 });

        const result = await runWeaponAction({
            data: createGameData({
                currentRound: 3,
                playerOne: {
                    weaponState: createWeaponState(weaponCard),
                },
                playerTwo: { health: 20 },
            }),
            actor: "playerOne",
            action: {
                spotId: null,
                owner: "OPPONENT",
            },
            expect: { error: null },
        });

        assert.equal(result.game.data.playerOne.stats.damageDealt, 4);
        assert.equal(result.game.data.playerOne.stats.heroAttacks, 1);
    });

    test("counts actual damage when overkill on minion", async ({ assert }) => {
        const { game } = await createTestGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        "SPOT_1",
                        createMinionState(createMinionCard({ attack: 0, health: 2 })),
                    ),
                },
            }),
        );

        executeAction(
            createCardActionSnapshot({
                type: "DAMAGE",
                damage: 5,
                target: createMinionTargetSnapshot("OPPONENT"),
            }),
            game,
            game.data.playerOne,
            game.data.playerTwo,
        );

        assert.equal(game.data.playerOne.stats.damageDealt, 2);
    });
});
