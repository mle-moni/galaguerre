import { DEFAULT_HERO_HEALTH } from "#api_types/game.types";
import { test } from "@japa/runner";
import { assertBoardSpot, assertPlayerHealth } from "#tests/helpers/game/assertions";
import {
    CARD_IDS,
    createCardActionSnapshot,
    createGameData,
    createHeroTargetSnapshot,
    createMinionCard,
    createWeaponCard,
    createWeaponState,
} from "#tests/helpers/game/fixtures";
import { runPlayMinion, runPlayWeapon } from "#tests/helpers/game/run_play_minion";

test.group("play card rules", () => {
    test("plays a valid minion card from hand", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 3,
            attack: 2,
            health: 3,
        });

        const { game } = await runPlayMinion(
            createGameData({
                currentRound: 4,
                playerOne: {
                    mana: 5,
                    hand: [handCard],
                },
            }),
            handCard,
        );

        assert.equal(game.data.playerOne.mana, 2);
        assert.equal(game.data.playerOne.hand.length, 0);
        assertBoardSpot(assert, game, "playerOne", "SPOT_1", { attack: 2, health: 3 });
    });

    test("sets placedAtRound to current round for summoning sickness", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            attack: 1,
            health: 2,
        });

        const { game } = await runPlayMinion(
            createGameData({
                currentRound: 5,
                playerOne: {
                    mana: 10,
                    hand: [handCard],
                },
            }),
            handCard,
        );

        assertBoardSpot(assert, game, "playerOne", "SPOT_1", { placedAtRound: 5 });
    });

    test("equips a weapon from hand", async ({ assert }) => {
        const weapon = createWeaponCard({ cost: 2, damage: 3, durability: 2 });

        const { game } = await runPlayWeapon(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [weapon],
                },
            }),
            weapon,
        );

        assert.equal(game.data.playerOne.mana, 8);
        assert.equal(game.data.playerOne.hand.length, 0);
        assert.isNotNull(game.data.playerOne.weaponState);
        assert.equal(game.data.playerOne.weaponState!.damage, 3);
        assert.equal(game.data.playerOne.weaponState!.durability, 2);
    });

    test("replaces equipped weapon when playing a new one", async ({ assert }) => {
        const oldWeapon = createWeaponCard({
            uuid: "card-old-weapon",
            cost: 2,
            damage: 1,
            durability: 1,
        });
        const newWeapon = createWeaponCard({
            uuid: "card-new-weapon",
            cost: 3,
            damage: 4,
            durability: 3,
        });

        const { game } = await runPlayWeapon(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [newWeapon],
                    weaponState: createWeaponState(oldWeapon),
                },
            }),
            newWeapon,
        );

        assert.equal(game.data.playerOne.weaponState!.damage, 4);
        assert.equal(game.data.playerOne.weaponState!.durability, 3);
    });

    test("triggers old weapon deathrattle when playing a new one", async ({ assert }) => {
        const oldWeapon = createWeaponCard({
            uuid: "card-old-weapon",
            cost: 2,
            damage: 1,
            durability: 1,
            deathrattleActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 2,
                    target: createHeroTargetSnapshot("OPPONENT"),
                }),
            ],
        });
        const newWeapon = createWeaponCard({
            uuid: "card-new-weapon",
            cost: 3,
            damage: 4,
            durability: 3,
        });

        const { game } = await runPlayWeapon(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [newWeapon],
                    weaponState: createWeaponState(oldWeapon),
                },
            }),
            newWeapon,
        );

        assertPlayerHealth(assert, game, "playerTwo", DEFAULT_HERO_HEALTH - 2);
        assert.equal(game.data.playerOne.weaponState!.damage, 4);
    });
});
