import { DEFAULT_HERO_HEALTH } from "#api_types/game.types";
import { test } from "@japa/runner";
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
import { runPlayWeapon, runPlayWeaponOnGame } from "#tests/helpers/game/run_play_minion";
import {
    runWeaponActionInMemory,
    runWeaponActionOnGameInMemory,
} from "#tests/helpers/game/run_weapon_action_in_memory";
import { runWeaponCombat, runWeaponCombatOnGame } from "#tests/helpers/game/run_weapon_combat";
import { assertError } from "#tests/helpers/game/socket_event_collector";

test.group("weapon combat", () => {
    test("weapon attacks opponent hero and reduces durability", async ({ assert }) => {
        const weaponCard = createWeaponCard({ damage: 3, durability: 2 });

        const { game } = await runWeaponCombat(
            createGameData({
                playerOne: {
                    weaponState: createWeaponState(weaponCard),
                },
            }),
            { spotId: null },
        );

        assertPlayerHealth(assert, game, "playerTwo", DEFAULT_HERO_HEALTH - 3);
        assert.equal(game.data.playerOne.weaponState!.durability, 1);
        assert.equal(game.data.playerOne.heroAttacksThisRound, 1);
        assert.equal(game.data.playerOne.heroLastAttackAtRound, 1);
    });

    test("weapon attacks minion and takes retaliation damage", async ({ assert }) => {
        const weaponCard = createWeaponCard({ damage: 3, durability: 2 });
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 2,
            health: 4,
        });

        const { game } = await runWeaponCombat(
            createGameData({
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
            { spotId: "SPOT_1" },
        );

        assertBoardSpot(assert, game, "playerTwo", "SPOT_1", { health: 1 });
        assertPlayerHealth(assert, game, "playerOne", DEFAULT_HERO_HEALTH - 2);
        assert.equal(game.data.playerOne.weaponState!.durability, 1);
    });

    test("weapon breaks at zero durability", async ({ assert }) => {
        const weaponCard = createWeaponCard({ damage: 5, durability: 1 });

        const { game } = await runWeaponCombat(
            createGameData({
                playerOne: {
                    weaponState: createWeaponState(weaponCard),
                },
            }),
            { spotId: null },
        );

        assert.isNull(game.data.playerOne.weaponState);
        assert.equal(game.data.playerOne.heroAttacksThisRound, 1);
        assert.equal(game.data.playerOne.heroLastAttackAtRound, 1);
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

        const { game: playGame } = await runPlayWeapon(
            createGameData({
                currentRound: 1,
                playerOne: {
                    mana: 10,
                    hand: [newWeapon],
                    weaponState: createWeaponState(oldWeapon),
                },
            }),
            newWeapon,
        );

        assert.equal(playGame.data.playerOne.heroAttacksThisRound, 0);
        assert.equal(playGame.data.playerOne.weaponState!.damage, 4);

        const { game: attackGame } = await runWeaponCombatOnGame(playGame, { spotId: null });

        assertPlayerHealth(assert, attackGame, "playerTwo", DEFAULT_HERO_HEALTH - 4);
        assert.equal(attackGame.data.playerOne.heroAttacksThisRound, 1);
        assert.equal(attackGame.data.playerOne.weaponState!.durability, 1);
    });

    test("rejects second weapon attack in the same turn", async ({ assert }) => {
        const weaponCard = createWeaponCard({ damage: 1, durability: 3 });

        await runWeaponActionInMemory(
            createGameData({
                currentRound: 1,
                playerOne: {
                    weaponState: createWeaponState(weaponCard),
                    heroAttacksThisRound: 1,
                    heroLastAttackAtRound: 1,
                },
            }),
            "playerOne",
            { spotId: null, owner: "OPPONENT" },
        );

        assertError(assert, "Vous avez déjà attaqué avec votre arme ce tour");
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

        const firstAttack = await runWeaponActionInMemory(
            createGameData({
                currentRound: 1,
                playerOne: {
                    mana: 10,
                    hand: [newWeapon],
                    weaponState: createWeaponState(breakingWeapon),
                },
            }),
            "playerOne",
            { spotId: null, owner: "OPPONENT" },
        );

        assert.isNull(firstAttack.game.data.playerOne.weaponState);
        assert.equal(firstAttack.game.data.playerOne.heroAttacksThisRound, 1);

        await runPlayWeaponOnGame(firstAttack.game, newWeapon);

        await runWeaponActionOnGameInMemory(firstAttack.game, "playerOne", {
            spotId: null,
            owner: "OPPONENT",
        });

        assertError(assert, "Vous avez déjà attaqué avec votre arme ce tour");
    });

    test("rejects hero attack when taunt minion is on board", async ({ assert }) => {
        const weaponCard = createWeaponCard({ damage: 3, durability: 2 });
        const tauntCard = createMinionCard({
            uuid: MINION_IDS.taunt,
            minionPowers: { hasTaunt: true },
            effects: ["Provocation"],
        });

        await runWeaponActionInMemory(
            createGameData({
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
            "playerOne",
            { spotId: null, owner: "OPPONENT" },
        );

        assertError(assert, "Vous devez d'abord attaquer un serviteur avec Provocation");
    });

    test("rejects weapon action when no weapon equipped", async ({ assert }) => {
        await runWeaponActionInMemory(createGameData(), "playerOne", {
            spotId: null,
            owner: "OPPONENT",
        });

        assertError(assert, "Vous n'avez pas d'arme équipée");
    });
});
