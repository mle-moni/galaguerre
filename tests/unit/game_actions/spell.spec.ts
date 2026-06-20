import { DEFAULT_HERO_HEALTH } from "#api_types/game.types";
import { test } from "@japa/runner";
import {
    createAllTargetSnapshot,
    createCardActionSnapshot,
    createGameData,
    createHeroTargetSnapshot,
    createMinionCard,
    createMinionState,
    createMinionTargetSnapshot,
    createSpellCard,
    placeMinion,
} from "#tests/helpers/game/fixtures";
import { assertBoardIndex } from "#tests/helpers/game/assertions";
import { runPlayCardInMemory } from "#tests/helpers/game/run_play_card_in_memory";
import { runSpellEffect } from "#tests/helpers/game/run_spell_effect";
import { assertError } from "#tests/helpers/game/socket_event_collector";

test.group("spell effects", () => {
    test("applies spellPower bonus to spell damage", ({ assert }) => {
        const spell = createSpellCard({ cost: 2 });

        const { game } = runSpellEffect(
            createGameData({
                playerOne: {
                    mana: 10,
                    spellPower: 2,
                    hand: [spell],
                },
                playerTwo: {
                    health: DEFAULT_HERO_HEALTH,
                },
            }),
            spell,
        );

        assert.equal(game.data.playerTwo.health, DEFAULT_HERO_HEALTH - 5);
    });

    test("plays targeted spell on enemy minion", ({ assert }) => {
        const enemyMinion = createMinionCard({ uuid: "enemy-minion", health: 4 });
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

        const { game } = runSpellEffect(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [spell],
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        0,
                        createMinionState(enemyMinion),
                    ),
                },
            }),
            spell,
            { actionTarget: { minionUuid: "enemy-minion", owner: "OPPONENT" } },
        );

        assert.equal(game.data.playerTwo.board.length, 0);
    });

    test("draw spell adds card to hand", ({ assert }) => {
        const deckCard = createMinionCard({ uuid: "deck-card" });
        const spell = createSpellCard({
            cost: 1,
            spellActions: [
                createCardActionSnapshot({
                    type: "DRAW",
                    isTargeted: false,
                    drawCount: 1,
                }),
            ],
        });

        const { game } = runSpellEffect(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [spell],
                    deckCards: [deckCard],
                },
            }),
            spell,
        );

        assert.equal(
            game.data.playerOne.hand.some((card) => card.uuid === "deck-card"),
            true,
        );
        assert.equal(game.data.playerOne.deckCards.length, 0);
    });

    test("spell lethal damage ends the game", ({ assert }) => {
        const spell = createSpellCard({
            cost: 2,
            spellActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    isTargeted: false,
                    damage: 15,
                    target: createHeroTargetSnapshot("OPPONENT"),
                }),
            ],
        });

        const { game } = runSpellEffect(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [spell],
                },
                playerTwo: {
                    health: 5,
                },
            }),
            spell,
        );

        assert.equal(game.data.playerTwo.health, -10);
        assert.isTrue(game.isFinished);
    });

    test("mass ALL damage spell hits heroes and minions on both teams", ({ assert }) => {
        const allyMinion = createMinionCard({ uuid: "ally-minion", health: 5 });
        const enemyMinion = createMinionCard({ uuid: "enemy-minion", health: 5 });
        const spell = createSpellCard({
            cost: 3,
            spellActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    isTargeted: false,
                    damage: 2,
                    target: createAllTargetSnapshot("ALL"),
                }),
            ],
        });

        const { game } = runSpellEffect(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [spell],
                    board: placeMinion(
                        createGameData().playerOne.board,
                        0,
                        createMinionState(allyMinion),
                    ),
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        0,
                        createMinionState(enemyMinion),
                    ),
                },
            }),
            spell,
        );

        assert.equal(game.data.playerOne.health, DEFAULT_HERO_HEALTH - 2);
        assert.equal(game.data.playerTwo.health, DEFAULT_HERO_HEALTH - 2);
        assert.equal(game.data.playerOne.board[0]!.health, 3);
        assert.equal(game.data.playerTwo.board[0]!.health, 3);
    });

    test("mass ALL damage spell with OPPONENT team only hits opponent characters", ({ assert }) => {
        const allyMinion = createMinionCard({ uuid: "ally-minion", health: 5 });
        const enemyMinion = createMinionCard({ uuid: "enemy-minion", health: 5 });
        const spell = createSpellCard({
            cost: 3,
            spellActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    isTargeted: false,
                    damage: 2,
                    target: createAllTargetSnapshot("OPPONENT"),
                }),
            ],
        });

        const { game } = runSpellEffect(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [spell],
                    board: placeMinion(
                        createGameData().playerOne.board,
                        0,
                        createMinionState(allyMinion),
                    ),
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        0,
                        createMinionState(enemyMinion),
                    ),
                },
            }),
            spell,
        );

        assert.equal(game.data.playerOne.health, DEFAULT_HERO_HEALTH);
        assert.equal(game.data.playerTwo.health, DEFAULT_HERO_HEALTH - 2);
        assert.equal(game.data.playerOne.board[0]!.health, 5);
        assert.equal(game.data.playerTwo.board[0]!.health, 3);
    });

    test("random damage spell hits one enemy minion", ({ assert }) => {
        const enemyMinion1 = createMinionCard({ uuid: "enemy-minion-1", health: 5 });
        const enemyMinion2 = createMinionCard({ uuid: "enemy-minion-2", health: 5 });
        const spell = createSpellCard({
            cost: 2,
            spellActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    isTargeted: false,
                    damage: 1,
                    target: createMinionTargetSnapshot("OPPONENT", {
                        maxTargets: 1,
                        targetSelectionMode: "RANDOM",
                    }),
                }),
            ],
        });

        const { game } = runSpellEffect(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [spell],
                },
                playerTwo: {
                    board: placeMinion(
                        placeMinion(
                            createGameData().playerTwo.board,
                            0,
                            createMinionState(enemyMinion1),
                        ),
                        1,
                        createMinionState(enemyMinion2),
                    ),
                },
            }),
            spell,
        );

        const board = game.data.playerTwo.board;
        const damagedCount = [0, 1, 2, 3, 4].filter(
            (boardIndex) => board[boardIndex]?.health === 4,
        ).length;
        assert.equal(damagedCount, 1);
    });

    test("random damage spell fizzles when no eligible minion exists", ({ assert }) => {
        const spell = createSpellCard({
            cost: 2,
            spellActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    isTargeted: false,
                    damage: 1,
                    target: createMinionTargetSnapshot("OPPONENT", {
                        maxTargets: 1,
                        targetSelectionMode: "RANDOM",
                    }),
                }),
            ],
        });

        const { game } = runSpellEffect(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [spell],
                },
            }),
            spell,
        );

        assert.equal(game.data.playerTwo.health, DEFAULT_HERO_HEALTH);
    });

    test("earth shock silences then damages the same minion", ({ assert }) => {
        const tauntMinion = createMinionCard({
            uuid: "taunt-minion",
            attack: 2,
            health: 1,
            minionPowers: { hasTaunt: true },
        });
        const spell = createSpellCard({
            cost: 1,
            spellActions: [
                createCardActionSnapshot({
                    type: "SILENCE",
                    isTargeted: true,
                    target: createMinionTargetSnapshot("ALL"),
                }),
                createCardActionSnapshot({
                    type: "DAMAGE",
                    isTargeted: true,
                    damage: 1,
                    target: createMinionTargetSnapshot("ALL"),
                }),
            ],
        });

        const { game } = runSpellEffect(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [spell],
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        0,
                        createMinionState(tauntMinion),
                    ),
                },
            }),
            spell,
            { actionTarget: { minionUuid: "taunt-minion", owner: "OPPONENT" } },
        );

        assert.equal(game.data.playerTwo.board.length, 0);
    });

    test("silence then damage removes native taunt when minion survives", ({ assert }) => {
        const tauntMinion = createMinionCard({
            uuid: "taunt-minion",
            attack: 2,
            health: 3,
            minionPowers: { hasTaunt: true },
            effects: ["Provocation"],
        });
        const spell = createSpellCard({
            cost: 1,
            spellActions: [
                createCardActionSnapshot({
                    type: "SILENCE",
                    isTargeted: true,
                    target: createMinionTargetSnapshot("ALL"),
                }),
                createCardActionSnapshot({
                    type: "DAMAGE",
                    isTargeted: true,
                    damage: 1,
                    target: createMinionTargetSnapshot("ALL"),
                }),
            ],
        });

        const { game } = runSpellEffect(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [spell],
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        0,
                        createMinionState(tauntMinion),
                    ),
                },
            }),
            spell,
            { actionTarget: { minionUuid: "taunt-minion", owner: "OPPONENT" } },
        );

        const card = game.data.playerTwo.board[0]!.originalCard;
        assert.isFalse(card.type === "MINION" && card.minionPowers.hasTaunt);
        assertBoardIndex(assert, game, "playerTwo", 0, { health: 2 });
    });

    test("applies spellPower bonus to each damage action", ({ assert }) => {
        const spell = createSpellCard({
            cost: 2,
            spellActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    isTargeted: false,
                    damage: 1,
                    target: createHeroTargetSnapshot("OPPONENT"),
                }),
                createCardActionSnapshot({
                    type: "DAMAGE",
                    isTargeted: false,
                    damage: 1,
                    target: createHeroTargetSnapshot("OPPONENT"),
                }),
            ],
        });

        const { game } = runSpellEffect(
            createGameData({
                playerOne: {
                    mana: 10,
                    spellPower: 2,
                    hand: [spell],
                },
                playerTwo: {
                    health: DEFAULT_HERO_HEALTH,
                },
            }),
            spell,
        );

        assert.equal(game.data.playerTwo.health, DEFAULT_HERO_HEALTH - 6);
    });

    test("rejects targeted spell on enemy stealth minion", async ({ assert }) => {
        const stealthMinion = createMinionCard({
            uuid: "stealth-minion",
            health: 4,
            minionPowers: { hasStealth: true },
            effects: ["Discrétion"],
        });
        const spell = createSpellCard({
            uuid: "targeted-spell",
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

        const { game } = await runPlayCardInMemory(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [spell],
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        0,
                        createMinionState(stealthMinion),
                    ),
                },
            }),
            "playerOne",
            {
                cardId: "targeted-spell",
                boardIndex: null,
                owner: "PLAYER",
                actionTarget: { minionUuid: "stealth-minion", owner: "OPPONENT" },
            },
        );

        assertError(assert, "Aucune cible valide pour cette carte");
        assertBoardIndex(assert, game, "playerTwo", 0, { health: 4 });
    });

    test("aoe spell damages stealth minion", ({ assert }) => {
        const stealthMinion = createMinionCard({
            uuid: "stealth-minion",
            health: 4,
            minionPowers: { hasStealth: true },
            effects: ["Discrétion"],
        });
        const spell = createSpellCard({
            cost: 2,
            spellActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    isTargeted: false,
                    damage: 2,
                    target: createMinionTargetSnapshot("OPPONENT"),
                }),
            ],
        });

        const { game } = runSpellEffect(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [spell],
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        0,
                        createMinionState(stealthMinion),
                    ),
                },
            }),
            spell,
        );

        assertBoardIndex(assert, game, "playerTwo", 0, { health: 2 });
    });
});
