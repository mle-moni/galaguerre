import { test } from "@japa/runner";
import type { MinionCard } from "#api_types/game.types";
import { applyBoostToMinion } from "#galaguerre/action_engine/apply_boost";
import { applySilenceToMinion } from "#galaguerre/action_engine/apply_silence";
import { getMinionHasDivineShield } from "#galaguerre/action_engine/apply_damage_to_minion";
import {
    createAllTargetSnapshot,
    createBoostSnapshot,
    createCardActionSnapshot,
    createEmptyBoard,
    createGameData,
    createMinionCard,
    createMinionPowersSnapshot,
    createMinionState,
    createMinionTargetSnapshot,
    createSpellCard,
    MINION_IDS,
    placeMinion,
} from "#tests/helpers/game/fixtures";
import { assertBoardSpot } from "#tests/helpers/game/assertions";
import { createInMemoryGame } from "#tests/helpers/game/in_memory_game";
import { runMinionCombat } from "#tests/helpers/game/run_minion_combat";
import { runSpellEffect } from "#tests/helpers/game/run_spell_effect";

const divineShieldPowers = createMinionPowersSnapshot({ hasDivineShield: true });

test.group("divine shield", () => {
    test("attacker keeps divine shield when retaliating minion has 0 attack", async ({
        assert,
    }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 3,
            health: 3,
            minionPowers: divineShieldPowers,
            effects: ["Immunité"],
        });
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 0,
            health: 2,
        });

        const { game } = await runMinionCombat(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        createEmptyBoard(),
                        "SPOT_1",
                        createMinionState(attackerCard),
                    ),
                },
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), "SPOT_1", createMinionState(targetCard)),
                },
            }),
        );

        const attacker = game.data.playerOne.board.SPOT_1!;
        assertBoardSpot(assert, game, "playerOne", "SPOT_1", { health: 3 });
        assert.isTrue(getMinionHasDivineShield(attacker));
        assert.equal(attacker.originalCard.type, "MINION");
        assert.include((attacker.originalCard as MinionCard).effects, "Immunité");
    });

    test("minion survives first combat hit and loses divine shield", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 3,
            health: 3,
        });
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 1,
            health: 1,
            minionPowers: divineShieldPowers,
            effects: ["Immunité"],
        });

        const { game } = await runMinionCombat(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        createEmptyBoard(),
                        "SPOT_1",
                        createMinionState(attackerCard),
                    ),
                },
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), "SPOT_1", createMinionState(targetCard)),
                },
            }),
        );

        const target = game.data.playerTwo.board.SPOT_1!;
        assertBoardSpot(assert, game, "playerTwo", "SPOT_1", { health: 1 });
        assert.isFalse(getMinionHasDivineShield(target));
        assert.equal(target.originalCard.type, "MINION");
        assert.notInclude((target.originalCard as MinionCard).effects, "Immunité");
    });

    test("minion dies on second combat hit after divine shield is consumed", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 3,
            health: 10,
        });
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 0,
            health: 1,
            minionPowers: divineShieldPowers,
            effects: ["Immunité"],
        });

        const initialData = createGameData({
            playerOne: {
                board: placeMinion(createEmptyBoard(), "SPOT_1", createMinionState(attackerCard)),
            },
            playerTwo: {
                board: placeMinion(createEmptyBoard(), "SPOT_1", createMinionState(targetCard)),
            },
        });

        const { game: gameAfterFirstHit } = await runMinionCombat(initialData);
        assertBoardSpot(assert, gameAfterFirstHit, "playerTwo", "SPOT_1", { health: 1 });

        const { game: gameAfterSecondHit } = await runMinionCombat(gameAfterFirstHit.data);
        assertBoardSpot(assert, gameAfterSecondHit, "playerTwo", "SPOT_1", null);
    });

    test("poisonous attacker pops divine shield without killing target", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 1,
            health: 1,
            minionPowers: createMinionPowersSnapshot({ isPoisonous: true }),
            effects: ["Toxique"],
        });
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 0,
            health: 9,
            minionPowers: divineShieldPowers,
            effects: ["Immunité"],
        });

        const { game } = await runMinionCombat(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        createEmptyBoard(),
                        "SPOT_1",
                        createMinionState(attackerCard),
                    ),
                },
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), "SPOT_1", createMinionState(targetCard)),
                },
            }),
        );

        const target = game.data.playerTwo.board.SPOT_1!;
        assertBoardSpot(assert, game, "playerTwo", "SPOT_1", { health: 9 });
        assert.isFalse(getMinionHasDivineShield(target));
    });

    test("targeted spell damage pops divine shield without reducing health", ({ assert }) => {
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 2,
            health: 4,
            minionPowers: divineShieldPowers,
            effects: ["Immunité"],
        });
        const spell = createSpellCard({
            cost: 2,
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
                    board: placeMinion(createEmptyBoard(), "SPOT_1", createMinionState(targetCard)),
                },
            }),
            spell,
            { actionTarget: { spotId: "SPOT_1", owner: "OPPONENT" } },
        );

        const target = game.data.playerTwo.board.SPOT_1!;
        assertBoardSpot(assert, game, "playerTwo", "SPOT_1", { health: 4 });
        assert.isFalse(getMinionHasDivineShield(target));
    });

    test("aoe spell pops divine shield on each minion individually", ({ assert }) => {
        const shieldedCard = createMinionCard({
            uuid: "shielded",
            attack: 1,
            health: 2,
            minionPowers: divineShieldPowers,
            effects: ["Immunité"],
        });
        const normalCard = createMinionCard({
            uuid: "normal",
            attack: 1,
            health: 2,
        });
        const spell = createSpellCard({
            cost: 4,
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
                        createEmptyBoard(),
                        "SPOT_1",
                        createMinionState(shieldedCard),
                    ),
                },
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), "SPOT_1", createMinionState(normalCard)),
                },
            }),
            spell,
        );

        const shielded = game.data.playerOne.board.SPOT_1!;
        assertBoardSpot(assert, game, "playerOne", "SPOT_1", { health: 2 });
        assert.isFalse(getMinionHasDivineShield(shielded));
        assertBoardSpot(assert, game, "playerTwo", "SPOT_1", null);
    });

    test("boost grants divine shield to minion without it", ({ assert }) => {
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 2,
            health: 3,
        });
        const target = createMinionState(targetCard);

        applyBoostToMinion(
            target,
            createBoostSnapshot({
                minionPowers: createMinionPowersSnapshot({ hasDivineShield: true }),
            }),
        );

        assert.isTrue(getMinionHasDivineShield(target));
        assert.equal(target.originalCard.type, "MINION");
        assert.include((target.originalCard as MinionCard).effects, "Immunité");
    });

    test("boost re-grants divine shield after it was consumed", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 1,
            health: 1,
        });
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 0,
            health: 3,
            minionPowers: divineShieldPowers,
            effects: ["Immunité"],
        });
        const target = createMinionState(targetCard);

        const { game } = await runMinionCombat(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        createEmptyBoard(),
                        "SPOT_1",
                        createMinionState(attackerCard),
                    ),
                },
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), "SPOT_1", target),
                },
            }),
        );

        const minion = game.data.playerTwo.board.SPOT_1!;
        assert.isFalse(getMinionHasDivineShield(minion));

        applyBoostToMinion(
            minion,
            createBoostSnapshot({
                minionPowers: createMinionPowersSnapshot({ hasDivineShield: true }),
            }),
        );

        assert.isTrue(getMinionHasDivineShield(minion));
        assert.equal(minion.originalCard.type, "MINION");
        assert.include((minion.originalCard as MinionCard).effects, "Immunité");
    });

    test("silence removes divine shield", ({ assert }) => {
        const targetCard = createMinionCard({
            uuid: MINION_IDS.target,
            attack: 2,
            health: 3,
            minionPowers: divineShieldPowers,
            effects: ["Immunité"],
        });
        const game = createInMemoryGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), "SPOT_1", createMinionState(targetCard)),
                },
            }),
        );

        applySilenceToMinion(game, game.data.playerTwo, "SPOT_1");

        const minion = game.data.playerTwo.board.SPOT_1!;
        assert.isFalse(getMinionHasDivineShield(minion));
        assert.equal(minion.originalCard.type, "MINION");
        assert.notInclude((minion.originalCard as MinionCard).effects, "Immunité");
    });
});
