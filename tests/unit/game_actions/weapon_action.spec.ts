import { DEFAULT_HERO_HEALTH } from "#api_types/game.types";
import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import { assertBoardSpot, assertPlayerHealth } from "#tests/helpers/game/assertions";
import {
    createGameData,
    createMinionCard,
    createMinionState,
    createWeaponCard,
    createWeaponState,
    MINION_IDS,
    placeMinion,
} from "#tests/helpers/game/fixtures";
import {
    assertPlayCardScenario,
    runPlayCard,
    runPlayCardOnGame,
} from "#tests/helpers/game/run_play_card";
import {
    assertWeaponActionScenario,
    runWeaponAction,
    runWeaponActionOnGame,
} from "#tests/helpers/game/run_weapon_action";

test.group("game:weapon_action", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("weapon attacks opponent hero and reduces durability", async ({ assert }) => {
        const weaponCard = createWeaponCard({ damage: 3, durability: 2 });

        const result = await runWeaponAction({
            data: createGameData({
                playerOne: {
                    weaponState: createWeaponState(weaponCard),
                },
            }),
            actor: "playerOne",
            action: {
                spotId: null,
                owner: "OPPONENT",
            },
            expect: { error: null },
        });

        assertWeaponActionScenario(assert, result, { error: null });
        assertPlayerHealth(assert, result.game, "playerTwo", DEFAULT_HERO_HEALTH - 3);
        assert.equal(result.game.data.playerOne.weaponState!.durability, 1);
        assert.equal(result.game.data.playerOne.heroAttacksThisRound, 1);
        assert.equal(result.game.data.playerOne.heroLastAttackAtRound, 1);
    });

    test("weapon attacks minion and takes retaliation damage", async ({ assert }) => {
        const weaponCard = createWeaponCard({ damage: 3, durability: 2 });
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 2,
            health: 4,
        });

        const result = await runWeaponAction({
            data: createGameData({
                playerOne: {
                    weaponState: createWeaponState(weaponCard),
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
                spotId: "SPOT_1",
                owner: "OPPONENT",
            },
            expect: { error: null },
        });

        assertWeaponActionScenario(assert, result, { error: null });
        assertBoardSpot(assert, result.game, "playerTwo", "SPOT_1", { health: 1 });
        assertPlayerHealth(assert, result.game, "playerOne", DEFAULT_HERO_HEALTH - 2);
        assert.equal(result.game.data.playerOne.weaponState!.durability, 1);
    });

    test("weapon breaks at zero durability", async ({ assert }) => {
        const weaponCard = createWeaponCard({ damage: 5, durability: 1 });

        const result = await runWeaponAction({
            data: createGameData({
                playerOne: {
                    weaponState: createWeaponState(weaponCard),
                },
            }),
            actor: "playerOne",
            action: {
                spotId: null,
                owner: "OPPONENT",
            },
            expect: { error: null },
        });

        assertWeaponActionScenario(assert, result, { error: null });
        assert.isNull(result.game.data.playerOne.weaponState);
        assert.equal(result.game.data.playerOne.heroAttacksThisRound, 1);
        assert.equal(result.game.data.playerOne.heroLastAttackAtRound, 1);
    });

    test("rejects second weapon attack in the same turn", async ({ assert }) => {
        const weaponCard = createWeaponCard({ damage: 1, durability: 3 });
        const weaponState = createWeaponState(weaponCard);

        const result = await runWeaponAction({
            data: createGameData({
                currentRound: 1,
                playerOne: {
                    weaponState,
                    heroAttacksThisRound: 1,
                    heroLastAttackAtRound: 1,
                },
            }),
            actor: "playerOne",
            action: {
                spotId: null,
                owner: "OPPONENT",
            },
            expect: {
                error: "Vous avez déjà attaqué avec votre arme ce tour",
            },
        });

        assertWeaponActionScenario(assert, result, {
            error: "Vous avez déjà attaqué avec votre arme ce tour",
        });
    });

    test("allows weapon attack after replacing weapon without attacking this turn", async ({
        assert,
    }) => {
        const oldWeapon = createWeaponCard({
            uuid: "card-old-weapon",
            cost: 2,
            damage: 1,
            durability: 3,
        });
        const newWeapon = createWeaponCard({
            uuid: "card-new-weapon",
            cost: 3,
            damage: 4,
            durability: 2,
        });

        const playResult = await runPlayCard({
            data: createGameData({
                currentRound: 1,
                playerOne: {
                    mana: 10,
                    hand: [newWeapon],
                    weaponState: createWeaponState(oldWeapon),
                },
            }),
            actor: "playerOne",
            action: {
                cardId: newWeapon.uuid,
                spotId: null,
                owner: "PLAYER",
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, playResult, { error: null });
        assert.equal(playResult.game.data.playerOne.heroAttacksThisRound, 0);
        assert.equal(playResult.game.data.playerOne.weaponState!.damage, 4);

        const attackResult = await runWeaponActionOnGame(playResult.game, playResult.actorUserId, {
            spotId: null,
            owner: "OPPONENT",
        });

        assertWeaponActionScenario(assert, attackResult, { error: null });
        assertPlayerHealth(assert, attackResult.game, "playerTwo", DEFAULT_HERO_HEALTH - 4);
        assert.equal(attackResult.game.data.playerOne.heroAttacksThisRound, 1);
        assert.equal(attackResult.game.data.playerOne.weaponState!.durability, 1);
    });

    test("rejects weapon attack after breaking weapon and re-equipping in the same turn", async ({
        assert,
    }) => {
        const breakingWeapon = createWeaponCard({ damage: 5, durability: 1 });
        const newWeapon = createWeaponCard({
            uuid: "card-new-weapon",
            cost: 3,
            damage: 3,
            durability: 2,
        });

        const firstAttack = await runWeaponAction({
            data: createGameData({
                currentRound: 1,
                playerOne: {
                    mana: 10,
                    hand: [newWeapon],
                    weaponState: createWeaponState(breakingWeapon),
                },
            }),
            actor: "playerOne",
            action: {
                spotId: null,
                owner: "OPPONENT",
            },
            expect: { error: null },
        });

        assertWeaponActionScenario(assert, firstAttack, { error: null });
        assert.isNull(firstAttack.game.data.playerOne.weaponState);
        assert.equal(firstAttack.game.data.playerOne.heroAttacksThisRound, 1);

        await runPlayCardOnGame(firstAttack.game, firstAttack.actorUserId, {
            cardId: newWeapon.uuid,
            spotId: null,
            owner: "PLAYER",
        });

        assert.isNotNull(firstAttack.game.data.playerOne.weaponState);

        const secondAttack = await runWeaponActionOnGame(
            firstAttack.game,
            firstAttack.actorUserId,
            {
                spotId: null,
                owner: "OPPONENT",
            },
        );

        assertWeaponActionScenario(assert, secondAttack, {
            error: "Vous avez déjà attaqué avec votre arme ce tour",
        });
    });

    test("rejects hero attack when taunt minion is on board", async ({ assert }) => {
        const weaponCard = createWeaponCard({ damage: 3, durability: 2 });
        const tauntCard = createMinionCard({
            uuid: MINION_IDS.taunt,
            hasTaunt: true,
            effects: ["Provocation"],
        });

        const result = await runWeaponAction({
            data: createGameData({
                playerOne: {
                    weaponState: createWeaponState(weaponCard),
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        "SPOT_1",
                        createMinionState(tauntCard),
                    ),
                },
            }),
            actor: "playerOne",
            action: {
                spotId: null,
                owner: "OPPONENT",
            },
            expect: {
                error: "Vous devez d'abord attaquer un serviteur avec Provocation",
            },
        });

        assertWeaponActionScenario(assert, result, {
            error: "Vous devez d'abord attaquer un serviteur avec Provocation",
        });
    });

    test("rejects weapon action when no weapon equipped", async ({ assert }) => {
        const result = await runWeaponAction({
            data: createGameData(),
            actor: "playerOne",
            action: {
                spotId: null,
                owner: "OPPONENT",
            },
            expect: {
                error: "Vous n'avez pas d'arme équipée",
            },
        });

        assertWeaponActionScenario(assert, result, {
            error: "Vous n'avez pas d'arme équipée",
        });
    });
});
