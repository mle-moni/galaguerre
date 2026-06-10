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
import { runPlayWeapon } from "#tests/helpers/game/run_play_minion";
import { runWeaponCombat, runWeaponCombatOnGame } from "#tests/helpers/game/run_weapon_combat";

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
});
