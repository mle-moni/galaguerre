import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import {
    createGameData,
    createMinionCard,
    createCardActionSnapshot,
    createHeroTargetSnapshot,
    createMinionState,
    CARD_IDS,
    MINION_IDS,
    placeMinion,
} from "#tests/helpers/game/fixtures";
import { createTestGame } from "#tests/helpers/game/game_factory";
import { runPlayCard } from "#tests/helpers/game/run_play_card";
import { runPassTurn, runSetupNextTurnOnGame } from "#tests/helpers/game/run_pass_turn";
import { runMinionAction } from "#tests/helpers/game/run_minion_action";

test.group("game action log", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("records PLAY_CARD when a minion is played", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            label: "Gobelin test",
            cost: 3,
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: {
                    mana: 5,
                    hand: [handCard],
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
            },
            expect: { error: null },
        });

        const log = result.game.data.actionLog;
        assert.equal(log.length, 1);
        assert.equal(log[0]!.type, "PLAY_CARD");
        assert.equal(log[0]!.playerId, result.actorUserId);
        assert.equal(log[0]!.roundNumber, 1);
        assert.equal(log[0]!.card?.label, "Gobelin test");
        assert.equal(log[0]!.card?.uuid, CARD_IDS.handMinion);
    });

    test("records PASS_TURN when a player passes", async ({ assert }) => {
        const result = await runPassTurn({
            data: createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 2,
                playerTwo: {
                    deckCards: [createMinionCard({ uuid: "draw" })],
                    hand: [],
                },
            }),
            actor: "playerOne",
            expect: { error: null },
        });

        const passEntry = result.game.data.actionLog.find((e) => e.type === "PASS_TURN");
        assert.isDefined(passEntry);
        assert.equal(passEntry!.playerId, result.actorUserId);
        assert.equal(passEntry!.roundNumber, 2);
    });

    test("records FATIGUE_DAMAGE when drawing from an empty deck", async ({ assert }) => {
        const { game, playerTwo } = await createTestGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 3,
                playerTwo: {
                    deckCards: [],
                    hand: [],
                    health: 15,
                    maxFatigueDamageTaken: 0,
                },
            }),
        );

        const result = await runSetupNextTurnOnGame(game);

        const fatigueEntry = result.game.data.actionLog.find((e) => e.type === "FATIGUE_DAMAGE");
        assert.isDefined(fatigueEntry);
        assert.equal(fatigueEntry!.playerId, playerTwo.id);
        assert.equal(fatigueEntry!.fatigueDamage, 1);
        assert.equal(fatigueEntry!.roundNumber, 3);
    });

    test("records escalating FATIGUE_DAMAGE on consecutive empty draws", async ({ assert }) => {
        const result = await runPassTurn({
            data: createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 3,
                playerTwo: {
                    deckCards: [],
                    hand: [],
                    health: 12,
                    maxFatigueDamageTaken: 2,
                },
            }),
            actor: "playerOne",
            expect: { error: null },
        });

        const fatigueEntries = result.game.data.actionLog.filter(
            (e) => e.type === "FATIGUE_DAMAGE",
        );
        assert.equal(fatigueEntries.length, 1);
        assert.equal(fatigueEntries[0]!.fatigueDamage, 3);
    });

    test("records ATTACK when a minion attacks another minion", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            label: "Attaquant",
            attack: 3,
            health: 3,
        });
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            label: "Cible",
            attack: 2,
            health: 4,
        });

        const result = await runMinionAction({
            data: createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        "SPOT_1",
                        createMinionState(attackerCard),
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

        const attackEntry = result.game.data.actionLog.find((e) => e.type === "ATTACK");
        assert.isDefined(attackEntry);
        assert.equal(attackEntry!.playerId, result.actorUserId);
        assert.equal(attackEntry!.attackerCard?.label, "Attaquant");
        assert.equal(attackEntry!.attackTarget?.type, "MINION");
        assert.equal(attackEntry!.attackTarget?.card?.label, "Cible");
    });

    test("records BATTLECRY after PLAY_CARD when a minion with battlecry is played", async ({
        assert,
    }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            label: "Crieur",
            cost: 2,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 3,
                    target: createHeroTargetSnapshot("OPPONENT"),
                }),
            ],
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: { health: 15 },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
            },
            expect: { error: null },
        });

        const log = result.game.data.actionLog;
        assert.equal(log.length, 2);
        assert.equal(log[0]!.type, "PLAY_CARD");
        assert.equal(log[1]!.type, "BATTLECRY");
        assert.equal(log[1]!.card?.label, "Crieur");
        assert.equal(log[1]!.playerId, result.actorUserId);
    });

    test("records DEATHRATTLE after ATTACK when a minion dies in combat", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            label: "Attaquant",
            attack: 3,
            health: 3,
        });
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            label: "Mort-vivant",
            attack: 1,
            health: 1,
            deathrattleActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 2,
                    target: createHeroTargetSnapshot("OPPONENT"),
                }),
            ],
        });

        const result = await runMinionAction({
            data: createGameData({
                playerOne: {
                    board: placeMinion(
                        createGameData().playerOne.board,
                        "SPOT_1",
                        createMinionState(attackerCard),
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

        const log = result.game.data.actionLog;
        const attackIndex = log.findIndex((e) => e.type === "ATTACK");
        const deathrattleIndex = log.findIndex((e) => e.type === "DEATHRATTLE");
        assert.isAbove(attackIndex, -1);
        assert.isAbove(deathrattleIndex, -1);
        assert.isBelow(attackIndex, deathrattleIndex);
        assert.equal(log[deathrattleIndex]!.card?.label, "Mort-vivant");
        assert.equal(log[deathrattleIndex]!.playerId, result.game.data.playerTwo.userId);
    });
});
