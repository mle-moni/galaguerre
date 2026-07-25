import { DEFAULT_HERO_HEALTH } from "#api_types/game.types";
import { test } from "@japa/runner";
import { assertBoardIndex, assertPlayerHealth } from "#tests/helpers/game/assertions";
import {
    createCardActionSnapshot,
    createGameData,
    createMinionCard,
    createMinionState,
    createMinionTargetSnapshot,
    createPassiveSnapshot,
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
            { heroAttack: true },
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
                        0,
                        createMinionState(targetCard),
                    ),
                },
            }),
            { targetIndex: 0 },
        );

        assertBoardIndex(assert, game, "playerTwo", 0, { health: 1 });
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
            { heroAttack: true },
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

        const { game: attackGame } = await runWeaponCombatOnGame(playGame, { heroAttack: true });

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
            { minionUuid: null, owner: "OPPONENT" },
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
            { minionUuid: null, owner: "OPPONENT" },
        );

        assert.isNull(firstAttack.game.data.playerOne.weaponState);
        assert.equal(firstAttack.game.data.playerOne.heroAttacksThisRound, 1);

        await runPlayWeaponOnGame(firstAttack.game, newWeapon);

        await runWeaponActionOnGameInMemory(firstAttack.game, "playerOne", {
            minionUuid: null,
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
                        0,
                        createMinionState(tauntCard),
                    ),
                },
            }),
            "playerOne",
            { minionUuid: null, owner: "OPPONENT" },
        );

        assertError(assert, "Vous devez d'abord attaquer un monstre avec Provocation");
    });

    test("allows hero attack when only taunt minion has stealth", async ({ assert }) => {
        const weaponCard = createWeaponCard({ damage: 3, durability: 2 });
        const stealthTauntCard = createMinionCard({
            uuid: "stealth-taunt",
            attack: 1,
            health: 3,
            minionPowers: { hasTaunt: true, hasStealth: true },
            effects: ["Provocation", "Discrétion"],
        });

        const { game } = await runWeaponActionInMemory(
            createGameData({
                playerOne: {
                    weaponState: createWeaponState(weaponCard),
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        0,
                        createMinionState(stealthTauntCard),
                    ),
                },
            }),
            "playerOne",
            { minionUuid: null, owner: "OPPONENT" },
        );

        assertPlayerHealth(assert, game, "playerTwo", DEFAULT_HERO_HEALTH - 3);
    });

    test("rejects weapon action when no weapon equipped", async ({ assert }) => {
        await runWeaponActionInMemory(createGameData(), "playerOne", {
            minionUuid: null,
            owner: "OPPONENT",
        });

        assertError(assert, "Vous n'avez pas d'arme équipée");
    });

    test("rejects hero attack when weapon cannot attack hero", async ({ assert }) => {
        const weaponCard = createWeaponCard({ damage: 3, durability: 2, cannotAttackHero: true });

        await runWeaponActionInMemory(
            createGameData({
                playerOne: {
                    weaponState: createWeaponState(weaponCard),
                },
            }),
            "playerOne",
            { minionUuid: null, owner: "OPPONENT" },
        );

        assertError(assert, "Cette arme ne peut pas attaquer le héros adverse");
    });

    test("allows minion attack when weapon cannot attack hero", async ({ assert }) => {
        const weaponCard = createWeaponCard({ damage: 3, durability: 2, cannotAttackHero: true });
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
                        0,
                        createMinionState(targetCard),
                    ),
                },
            }),
            { targetIndex: 0 },
        );

        assertBoardIndex(assert, game, "playerTwo", 0, { health: 1 });
        assertPlayerHealth(assert, game, "playerOne", DEFAULT_HERO_HEALTH - 2);
        assert.equal(game.data.playerOne.weaponState!.durability, 1);
    });

    test("requires attacking taunt minion when weapon cannot attack hero", async ({ assert }) => {
        const weaponCard = createWeaponCard({ damage: 3, durability: 2, cannotAttackHero: true });
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
                        0,
                        createMinionState(tauntCard),
                    ),
                },
            }),
            "playerOne",
            { minionUuid: null, owner: "OPPONENT" },
        );

        assertError(assert, "Cette arme ne peut pas attaquer le héros adverse");
    });

    test("HERO_ATTACK passive triggers when weapon attacks hero", async ({ assert }) => {
        const weaponCard = createWeaponCard({ damage: 2, durability: 2 });
        const passiveMinion = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 3,
            health: 2,
            passives: [
                createPassiveSnapshot({
                    type: "ACTION",
                    triggersOn: "HERO_ATTACK",
                    action: createCardActionSnapshot({
                        type: "BOOST",
                        boost: {
                            attack: 1,
                            health: 2,
                            spellPower: null,
                            extraBattlecryTriggers: null,
                            minionPowers: null,
                        },
                        target: createMinionTargetSnapshot("PLAYER", { onlySelf: true }),
                    }),
                }),
            ],
        });

        const { game } = await runWeaponCombat(
            createGameData({
                playerOne: {
                    weaponState: createWeaponState(weaponCard),
                    board: placeMinion(
                        createGameData().playerOne.board,
                        0,
                        createMinionState(passiveMinion),
                    ),
                },
            }),
            { heroAttack: true },
        );

        assertPlayerHealth(assert, game, "playerTwo", DEFAULT_HERO_HEALTH - 2);
        assertBoardIndex(assert, game, "playerOne", 0, { attack: 4, health: 4 });
    });

    test("heroAttackActions place a card in opponent deck after hero attacks", async ({
        assert,
    }) => {
        const weaponCard = createWeaponCard({
            damage: 2,
            durability: 2,
            heroAttackActions: [
                createCardActionSnapshot({
                    type: "DECK_CARD",
                    deckCardOperation: "ADD",
                    deckPlacement: "TOP",
                    deckTargetTeam: "OPPONENT",
                    cardId: 185,
                    copyCount: 1,
                }),
            ],
        });

        const { game } = await runWeaponCombat(
            createGameData({
                playerOne: {
                    weaponState: createWeaponState(weaponCard),
                },
                playerTwo: {
                    deckCards: [],
                },
            }),
            { heroAttack: true },
        );

        assert.equal(game.data.playerTwo.deckCards.length, 1);
        assert.equal(game.data.playerTwo.deckCards[0]!.cardId, 185);
    });
});
