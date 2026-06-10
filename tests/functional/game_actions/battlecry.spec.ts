import { DEFAULT_HERO_HEALTH } from "#api_types/game.types";
import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import { assertPlayerHealth } from "#tests/helpers/game/assertions";
import {
    CARD_IDS,
    createBoostSnapshot,
    createCardActionSnapshot,
    createComparisonSnapshot,
    createGameData,
    createHeroTargetSnapshot,
    createMinionCard,
    createMinionState,
    createMinionTargetSnapshot,
    MINION_IDS,
    placeMinion,
} from "#tests/helpers/game/fixtures";
import { assertPlayCardScenario, runPlayCard } from "#tests/helpers/game/run_play_card";

test.group("game:play_card battlecries", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());
    test("minion without battlecry behaves as before", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 3,
            attack: 2,
            health: 3,
        });

        const result = await runPlayCard({
            data: createGameData({
                currentRound: 4,
                playerOne: {
                    mana: 5,
                    hand: [handCard],
                },
                playerTwo: { health: DEFAULT_HERO_HEALTH },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assert.equal(result.game.data.playerOne.mana, 2);
        assert.equal(result.game.data.playerOne.hand.length, 0);
        assertPlayerHealth(assert, result.game, "playerTwo", DEFAULT_HERO_HEALTH);
    });


    test("rejects targeted action without actionTarget", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 5,
                    isTargeted: true,
                    target: createHeroTargetSnapshot("OPPONENT"),
                }),
            ],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: { health: DEFAULT_HERO_HEALTH },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
            },
            expect: { error: "Vous devez choisir une cible pour cette carte" },
        });

        assertPlayCardScenario(assert, result, {
            error: "Vous devez choisir une cible pour cette carte",
        });
        assertPlayerHealth(assert, result.game, "playerTwo", DEFAULT_HERO_HEALTH);
    });


    test("rejects invalid targeted minion", async ({ assert }) => {
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            health: 4,
            attack: 1,
        });
        const targetMinion = createMinionState(targetCard);

        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 3,
                    isTargeted: true,
                    target: createMinionTargetSnapshot("OPPONENT", {
                        comparison: createComparisonSnapshot({
                            attackComparison: ">",
                            attack: 2,
                        }),
                    }),
                }),
            ],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: {
                    board: placeMinion(createGameData().playerTwo.board, "SPOT_2", targetMinion),
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
                actionTarget: { spotId: "SPOT_2", owner: "OPPONENT" },
            },
            expect: { error: "Cible invalide pour cette carte" },
        });

        assertPlayCardScenario(assert, result, {
            error: "Cible invalide pour cette carte",
        });
    });

    test("rejects targeted minion when current attack fails comparison despite printed attack", async ({
        assert,
    }) => {
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            health: 4,
            attack: 3,
        });
        const targetMinion = createMinionState(targetCard, { attack: 1 });

        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 2,
                    isTargeted: true,
                    target: createMinionTargetSnapshot("OPPONENT", {
                        comparison: createComparisonSnapshot({
                            attackComparison: ">",
                            attack: 2,
                        }),
                    }),
                }),
            ],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: {
                    board: placeMinion(createGameData().playerTwo.board, "SPOT_2", targetMinion),
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
                actionTarget: { spotId: "SPOT_2", owner: "OPPONENT" },
            },
            expect: { error: "Cible invalide pour cette carte" },
        });

        assertPlayCardScenario(assert, result, {
            error: "Cible invalide pour cette carte",
        });
    });


    test("rejects targeted BOOST without actionTarget", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "BOOST",
                    isTargeted: true,
                    boost: createBoostSnapshot({ attack: 2, health: 2 }),
                    target: createMinionTargetSnapshot("PLAYER"),
                }),
            ],
        });

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
            expect: { error: "Vous devez choisir une cible pour cette carte" },
        });

        assertPlayCardScenario(assert, result, {
            error: "Vous devez choisir une cible pour cette carte",
        });
    });


});
