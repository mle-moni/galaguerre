import { DEFAULT_HERO_HEALTH } from "#api_types/game.types";
import { test } from "@japa/runner";
import { assertBoardIndex, assertPlayerHealth } from "#tests/helpers/game/assertions";
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
    createSpellCard,
    createWeaponCard,
    createWeaponState,
    MINION_IDS,
    placeMinion,
} from "#tests/helpers/game/fixtures";
import { runPlayCardInMemory } from "#tests/helpers/game/run_play_card_in_memory";
import { runPlayMinion, runPlaySpell, runPlayWeapon } from "#tests/helpers/game/run_play_minion";
import { assertError } from "#tests/helpers/game/socket_event_collector";

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
        assertBoardIndex(assert, game, "playerOne", 0, { attack: 2, health: 3 });
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

        assertBoardIndex(assert, game, "playerOne", 0, { placedAtRound: 5 });
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

    test("plays a valid spell card from hand", async ({ assert }) => {
        const spell = createSpellCard({ cost: 2 });

        const { game } = await runPlaySpell(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [spell],
                },
                playerTwo: {
                    health: DEFAULT_HERO_HEALTH,
                },
            }),
            spell,
        );

        assert.equal(game.data.playerOne.mana, 8);
        assert.equal(game.data.playerOne.hand.length, 0);
        assert.equal(game.data.playerTwo.health, DEFAULT_HERO_HEALTH - 3);
    });

    test("rejects play when mana is insufficient", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 5,
        });

        const { game, errors } = await runPlayCardInMemory(
            createGameData({
                playerOne: {
                    mana: 2,
                    hand: [handCard],
                },
            }),
            "playerOne",
            {
                cardId: CARD_IDS.handMinion,
                boardIndex: 0,
                owner: "PLAYER",
            },
        );

        assertError(assert, "Vous n'avez pas assez de mana pour jouer cette carte");
        assert.equal(game.data.playerOne.hand.length, 1);
        assert.equal(errors.length, 1);
    });

    test("rejects play when card is not in hand", async ({ assert }) => {
        const { errors } = await runPlayCardInMemory(createGameData(), "playerOne", {
            cardId: "missing-card",
            boardIndex: 0,
            owner: "PLAYER",
        });

        assert.equal(errors.length, 1);
        assert.equal(errors[0], "Cette carte n'est pas dans votre main (gros con)");
    });

    test("inserts a minion before existing board minions", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 1,
            attack: 1,
            health: 1,
        });
        const existing = createMinionCard({ uuid: "existing-minion", attack: 4, health: 5 });

        const { game } = await runPlayCardInMemory(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [handCard],
                    board: placeMinion(
                        createGameData().playerOne.board,
                        0,
                        createMinionState(existing),
                    ),
                },
            }),
            "playerOne",
            {
                cardId: CARD_IDS.handMinion,
                boardIndex: 0,
                owner: "PLAYER",
            },
        );

        assertBoardIndex(assert, game, "playerOne", 0, { attack: 1, health: 1 });
        assertBoardIndex(assert, game, "playerOne", 1, { attack: 4, health: 5 });
    });

    test("rejects play when board is full", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 1,
        });
        let board = createGameData().playerOne.board;

        for (let index = 0; index < 7; index++) {
            board = placeMinion(
                board,
                index,
                createMinionState(createMinionCard({ uuid: `filler-${index}` })),
            );
        }

        await runPlayCardInMemory(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [handCard],
                    board,
                },
            }),
            "playerOne",
            {
                cardId: CARD_IDS.handMinion,
                boardIndex: 7,
                owner: "PLAYER",
            },
        );

        assertError(assert, "Vous ne pouvez pas jouer cette carte ici");
    });

    test("rejects invalid board index", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 1,
        });

        await runPlayCardInMemory(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [handCard],
                },
            }),
            "playerOne",
            {
                cardId: CARD_IDS.handMinion,
                boardIndex: 2,
                owner: "PLAYER",
            },
        );

        assertError(assert, "Vous ne pouvez pas jouer cette carte ici");
    });

    test("rejects play with owner OPPONENT", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 1,
        });

        await runPlayCardInMemory(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [handCard],
                },
            }),
            "playerOne",
            {
                cardId: CARD_IDS.handMinion,
                boardIndex: 0,
                owner: "OPPONENT",
            },
        );

        assertError(assert, "Vous ne pouvez pas jouer cette carte ici");
    });

    test("rejects spell play when mana is insufficient", async ({ assert }) => {
        const spell = createSpellCard({ cost: 5 });

        const { game, errors } = await runPlayCardInMemory(
            createGameData({
                playerOne: {
                    mana: 2,
                    hand: [spell],
                },
            }),
            "playerOne",
            {
                cardId: CARD_IDS.spell,
                boardIndex: null,
                owner: "PLAYER",
            },
        );

        assertError(assert, "Vous n'avez pas assez de mana pour jouer cette carte");
        assert.equal(game.data.playerOne.hand.length, 1);
        assert.equal(errors.length, 1);
    });

    test("rejects targeted spell without action target", async ({ assert }) => {
        const spell = createSpellCard({
            cost: 3,
            spellActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    isTargeted: true,
                    damage: 4,
                    target: createMinionTargetSnapshot("OPPONENT"),
                }),
            ],
        });

        await runPlayCardInMemory(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [spell],
                },
            }),
            "playerOne",
            {
                cardId: CARD_IDS.spell,
                boardIndex: null,
                owner: "PLAYER",
            },
        );

        assertError(assert, "Aucune cible valide pour cette carte");
    });

    test("rejects play when it is not the player turn", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 1,
        });

        await runPlayCardInMemory(
            createGameData({
                state: "PLAYER_ONE_TURN",
                playerOne: {
                    mana: 10,
                    hand: [handCard],
                },
            }),
            "playerTwo",
            {
                cardId: CARD_IDS.handMinion,
                boardIndex: 0,
                owner: "PLAYER",
            },
        );

        assertError(assert, "Ce n'est pas votre tour (gros con)");
    });

    test("rejects targeted battlecry without actionTarget", async ({ assert }) => {
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

        const { game } = await runPlayCardInMemory(
            createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: { health: DEFAULT_HERO_HEALTH },
            }),
            "playerOne",
            {
                cardId: CARD_IDS.handMinion,
                boardIndex: 0,
                owner: "PLAYER",
            },
        );

        assertError(assert, "Vous devez choisir une cible pour cette carte");
        assertPlayerHealth(assert, game, "playerTwo", DEFAULT_HERO_HEALTH);
    });

    test("rejects invalid targeted minion battlecry", async ({ assert }) => {
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            health: 4,
            attack: 1,
        });
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

        await runPlayCardInMemory(
            createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        1,
                        createMinionState(targetCard),
                    ),
                },
            }),
            "playerOne",
            {
                cardId: CARD_IDS.handMinion,
                boardIndex: 0,
                owner: "PLAYER",
                actionTarget: { minionUuid: MINION_IDS.target, owner: "OPPONENT" },
            },
        );

        assertError(assert, "Aucune cible valide pour cette carte");
    });

    test("rejects targeted minion when current attack fails comparison", async ({ assert }) => {
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            health: 4,
            attack: 3,
        });
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

        await runPlayCardInMemory(
            createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        1,
                        createMinionState(targetCard, { attack: 1 }),
                    ),
                },
            }),
            "playerOne",
            {
                cardId: CARD_IDS.handMinion,
                boardIndex: 0,
                owner: "PLAYER",
                actionTarget: { minionUuid: MINION_IDS.target, owner: "OPPONENT" },
            },
        );

        assertError(assert, "Aucune cible valide pour cette carte");
    });

    test("rejects targeted BOOST battlecry without actionTarget", async ({ assert }) => {
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

        await runPlayCardInMemory(
            createGameData({
                playerOne: { mana: 10, hand: [handCard] },
            }),
            "playerOne",
            {
                cardId: CARD_IDS.handMinion,
                boardIndex: 0,
                owner: "PLAYER",
            },
        );

        assertError(assert, "Aucune cible valide pour cette carte");
    });
});
