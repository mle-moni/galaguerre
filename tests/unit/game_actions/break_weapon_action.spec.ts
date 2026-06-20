import { DEFAULT_HERO_HEALTH } from "#api_types/game.types";
import { test } from "@japa/runner";
import { executeAction } from "#galaguerre/action_engine/execute_action";
import { assertPlayerHealth } from "#tests/helpers/game/assertions";
import {
    createCardActionSnapshot,
    createGameData,
    createHeroTargetSnapshot,
    createWeaponCard,
    createWeaponState,
} from "#tests/helpers/game/fixtures";
import { createInMemoryGame } from "#tests/helpers/game/in_memory_game";

const createGame = (data: ReturnType<typeof createGameData>) => createInMemoryGame(data);

const breakOpponentWeapon = createCardActionSnapshot({
    type: "BREAK_WEAPON",
    target: createHeroTargetSnapshot("OPPONENT"),
});

const breakAllyWeapon = createCardActionSnapshot({
    type: "BREAK_WEAPON",
    target: createHeroTargetSnapshot("PLAYER"),
});

const breakAllWeapons = createCardActionSnapshot({
    type: "BREAK_WEAPON",
    target: createHeroTargetSnapshot("ALL"),
});

const targetedBreakOpponentWeapon = createCardActionSnapshot({
    type: "BREAK_WEAPON",
    isTargeted: true,
    target: createHeroTargetSnapshot("OPPONENT"),
});

test.group("BREAK_WEAPON action", () => {
    test("destroys opponent weapon", ({ assert }) => {
        const weaponCard = createWeaponCard({ uuid: "enemy-weapon" });
        const game = createGame(
            createGameData({
                playerTwo: {
                    weaponState: createWeaponState(weaponCard),
                },
            }),
        );

        executeAction(breakOpponentWeapon, game, game.data.playerOne, game.data.playerTwo);

        assert.isNull(game.data.playerTwo.weaponState);
    });

    test("destroys ally weapon", ({ assert }) => {
        const weaponCard = createWeaponCard({ uuid: "ally-weapon" });
        const game = createGame(
            createGameData({
                playerOne: {
                    weaponState: createWeaponState(weaponCard),
                },
            }),
        );

        executeAction(breakAllyWeapon, game, game.data.playerOne, game.data.playerTwo);

        assert.isNull(game.data.playerOne.weaponState);
    });

    test("destroys both heroes weapons when targetTeam is ALL", ({ assert }) => {
        const allyWeapon = createWeaponCard({ uuid: "ally-weapon" });
        const enemyWeapon = createWeaponCard({ uuid: "enemy-weapon" });
        const game = createGame(
            createGameData({
                playerOne: {
                    weaponState: createWeaponState(allyWeapon),
                },
                playerTwo: {
                    weaponState: createWeaponState(enemyWeapon),
                },
            }),
        );

        executeAction(breakAllWeapons, game, game.data.playerOne, game.data.playerTwo);

        assert.isNull(game.data.playerOne.weaponState);
        assert.isNull(game.data.playerTwo.weaponState);
    });

    test("does nothing when hero has no weapon", ({ assert }) => {
        const game = createGame(createGameData());

        executeAction(breakOpponentWeapon, game, game.data.playerOne, game.data.playerTwo);

        assert.isNull(game.data.playerOne.weaponState);
        assert.isNull(game.data.playerTwo.weaponState);
    });

    test("targeted BREAK_WEAPON destroys opponent weapon", ({ assert }) => {
        const weaponCard = createWeaponCard({ uuid: "enemy-weapon" });
        const game = createGame(
            createGameData({
                playerTwo: {
                    weaponState: createWeaponState(weaponCard),
                },
            }),
        );

        executeAction(targetedBreakOpponentWeapon, game, game.data.playerOne, game.data.playerTwo, {
            minionUuid: null,
            owner: "OPPONENT",
        });

        assert.isNull(game.data.playerTwo.weaponState);
    });

    test("triggers weapon deathrattle when breaking weapon", ({ assert }) => {
        const weaponCard = createWeaponCard({
            uuid: "enemy-weapon",
            deathrattleActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 2,
                    target: createHeroTargetSnapshot("OPPONENT"),
                }),
            ],
        });
        const game = createGame(
            createGameData({
                playerTwo: {
                    weaponState: createWeaponState(weaponCard),
                },
            }),
        );

        executeAction(breakOpponentWeapon, game, game.data.playerOne, game.data.playerTwo);

        assert.isNull(game.data.playerTwo.weaponState);
        assertPlayerHealth(assert, game, "playerOne", DEFAULT_HERO_HEALTH - 2);
    });
});
