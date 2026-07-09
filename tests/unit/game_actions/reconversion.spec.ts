import { test } from "@japa/runner";
import { DEFAULT_HERO_HEALTH } from "#api_types/game.types";
import { executeAction } from "#galaguerre/action_engine/execute_action";
import { killMinion } from "#galaguerre/action_engine/kill_minion";
import {
    applyReconversionToAllMinions,
    applyReconversionToMinion,
} from "#galaguerre/action_engine/apply_reconversion";
import { applyBoostToMinion } from "#galaguerre/action_engine/apply_boost";
import { refreshAurasAfterMinionPlayed } from "#galaguerre/passive_engine/refresh_passive_auras";
import { getCollectibleMinionCardTemplates } from "#galaguerre/card_catalog";
import {
    createBoostSnapshot,
    createCardActionSnapshot,
    createComparisonSnapshot,
    createEmptyBoard,
    createGameData,
    createMinionCard,
    createMinionState,
    createMinionTargetSnapshot,
    createPassiveSnapshot,
    createReconvertParametersSnapshot,
    createSpellCard,
    placeMinion,
} from "#tests/helpers/game/fixtures";
import { assertBoardIndex, assertPlayerHealth } from "#tests/helpers/game/assertions";
import { createInMemoryGame } from "#tests/helpers/game/in_memory_game";
import { runMinionActionOnGameInMemory } from "#tests/helpers/game/run_minion_action_in_memory";
import { runPassTurnFromGame } from "#tests/helpers/game/run_setup_next_turn";
import { runSpellEffect } from "#tests/helpers/game/run_spell_effect";
import { withSeededRandom } from "#tests/helpers/deterministic_random";
import { assertError } from "#tests/helpers/game/socket_event_collector";

const createGame = (data: ReturnType<typeof createGameData>) => createInMemoryGame(data);

const LEGUME_CARD_ID = 121;

const legumeParameters = () => createReconvertParametersSnapshot({ cardId: LEGUME_CARD_ID });

const applyLegumeReconversion = (
    game: ReturnType<typeof createInMemoryGame>,
    owner: "playerOne" | "playerTwo",
    boardIndex: 0 | 1 | 2 | 3 | 4,
    sourceMinion: ReturnType<typeof createMinionState>,
    controller: "playerOne" | "playerTwo" = "playerOne",
) => {
    applyReconversionToMinion(
        game,
        game.data[owner],
        boardIndex,
        legumeParameters(),
        sourceMinion,
        game.data[controller],
    );
};

test.group("RECONVERSION action", () => {
    test("transforms buffed minion into Légume 1/1 with full health", ({ assert }) => {
        const targetCard = createMinionCard({ uuid: "target", attack: 5, health: 5, cardId: 10 });
        const target = createMinionState(targetCard);
        applyBoostToMinion(target, createBoostSnapshot({ attack: 2, health: 2 }));

        const game = createGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), 0, target),
                },
            }),
        );

        applyLegumeReconversion(game, "playerTwo", 0, target);

        assertBoardIndex(assert, game, "playerTwo", 0, {
            attack: 1,
            health: 1,
            maxHealth: 1,
        });
        assert.equal(game.data.playerTwo.board[0]!.originalCard.cardId, LEGUME_CARD_ID);
        assert.equal(game.data.playerTwo.board[0]!.originalCard.label, "Légume");
        assert.equal(game.data.playerTwo.board[0]!.uuid, "target");
    });

    test("reconverted minion keeps all effects of the new card form", ({ assert }) => {
        const DIRECTEUR_COMMERCIAL_CARD_ID = 81;
        const targetCard = createMinionCard({ uuid: "target", attack: 3, health: 3 });
        const target = createMinionState(targetCard);

        const game = createGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), 0, target),
                },
            }),
        );

        applyReconversionToMinion(
            game,
            game.data.playerTwo,
            0,
            createReconvertParametersSnapshot({ cardId: DIRECTEUR_COMMERCIAL_CARD_ID }),
            target,
            game.data.playerOne,
        );

        const minion = game.data.playerTwo.board[0]!;
        const card = minion.originalCard;
        assert.isFalse(minion.isSilenced);
        assert.equal(card.type === "MINION" ? card.cardId : -1, DIRECTEUR_COMMERCIAL_CARD_ID);
        assert.isAbove(card.type === "MINION" ? card.deathrattleActions.length : 0, 0);
    });

    test("does not trigger deathrattle of the original minion", ({ assert }) => {
        const targetCard = createMinionCard({
            uuid: "target",
            attack: 4,
            health: 4,
            deathrattleActions: [
                createCardActionSnapshot({
                    type: "DRAW",
                    drawCount: 2,
                }),
            ],
        });
        const target = createMinionState(targetCard);

        const game = createGame(
            createGameData({
                playerTwo: {
                    deckCards: [createMinionCard({ uuid: "deck-1" })],
                    board: placeMinion(createEmptyBoard(), 0, target),
                },
            }),
        );

        applyLegumeReconversion(game, "playerTwo", 0, target);

        assert.equal(game.data.playerTwo.deckCards.length, 1);
        assert.isNotNull(game.data.playerTwo.board[0]);
    });

    test("reconverted minion does not trigger original deathrattle on kill", ({ assert }) => {
        const targetCard = createMinionCard({
            uuid: "target",
            attack: 1,
            health: 1,
            deathrattleActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 5,
                    target: createMinionTargetSnapshot("OPPONENT", { type: "HERO" }),
                }),
            ],
        });
        const target = createMinionState(targetCard);

        const game = createGame(
            createGameData({
                playerOne: { health: 30 },
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), 0, target),
                },
            }),
        );

        applyLegumeReconversion(game, "playerTwo", 0, target);
        killMinion(game, game.data.playerTwo, target.uuid);

        assert.equal(game.data.playerOne.health, 30);
    });

    test("reconverted aura-buffed pet stays at legume 1/1 without subtracting aura", ({
        assert,
    }) => {
        const pet = createMinionCard({ uuid: "pet", attack: 2, health: 2, tags: ["PETS"] });
        const auraSource = createMinionCard({
            uuid: "aura-source",
            tags: ["PETS"],
            passives: [
                createPassiveSnapshot({
                    type: "BOOST",
                    triggersOn: null,
                    passiveBoost: {
                        boost: createBoostSnapshot({ attack: 2, health: 1 }),
                        target: createMinionTargetSnapshot("PLAYER", {
                            tag: "PETS",
                            excludeSelf: true,
                        }),
                    },
                }),
            ],
        });

        const game = createGame(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        placeMinion(createEmptyBoard(), 0, createMinionState(pet)),
                        1,
                        createMinionState(auraSource),
                    ),
                },
            }),
        );

        refreshAurasAfterMinionPlayed(game, game.data.playerOne, 1);
        assertBoardIndex(assert, game, "playerOne", 0, { attack: 4, health: 3 });

        applyLegumeReconversion(game, "playerOne", 0, game.data.playerOne.board[0]!);

        assertBoardIndex(assert, game, "playerOne", 0, {
            attack: 1,
            health: 1,
            maxHealth: 1,
        });
        assert.equal(game.data.playerOne.board[0]!.originalCard.cardId, LEGUME_CARD_ID);
    });

    test("removes aura from reconverted source minion", ({ assert }) => {
        const ally = createMinionCard({ uuid: "ally", attack: 2, health: 2 });
        const auraSource = createMinionCard({
            uuid: "aura-source",
            passives: [
                createPassiveSnapshot({
                    type: "BOOST",
                    triggersOn: null,
                    passiveBoost: {
                        boost: createBoostSnapshot({ attack: 1, health: 1 }),
                        target: createMinionTargetSnapshot("PLAYER", { excludeSelf: true }),
                    },
                }),
            ],
        });
        const auraSourceState = createMinionState(auraSource);

        const game = createGame(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        placeMinion(createEmptyBoard(), 0, createMinionState(ally)),
                        1,
                        auraSourceState,
                    ),
                },
            }),
        );

        refreshAurasAfterMinionPlayed(game, game.data.playerOne, 1);
        assert.equal(game.data.playerOne.board[0]!.attack, 3);

        applyLegumeReconversion(game, "playerOne", 1, auraSourceState);

        assert.equal(game.data.playerOne.board[0]!.attack, 2);
        assert.equal(game.data.playerOne.board[1]!.attack, 1);
    });

    test("reconverted minion keeps innate keyword effects from new form", ({ assert }) => {
        const DEV_AIGRI_CARD_ID = 65;

        const targetCard = createMinionCard({ uuid: "target", attack: 1, health: 1 });
        const target = createMinionState(targetCard);

        const game = createGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), 0, target),
                },
            }),
        );

        applyReconversionToMinion(
            game,
            game.data.playerTwo,
            0,
            createReconvertParametersSnapshot({ cardId: DEV_AIGRI_CARD_ID }),
            target,
            game.data.playerOne,
        );

        const minion = game.data.playerTwo.board[0]!;
        const card = minion.originalCard;
        assert.equal(card.type === "MINION" ? card.cardId : -1, DEV_AIGRI_CARD_ID);
        assert.isTrue(card.type === "MINION" && card.minionPowers.hasTaunt);
        assert.isTrue(card.type === "MINION" && card.effects.includes("Provocation"));
        assert.include(card.type === "MINION" ? card.description : "", "Provocation");
        assert.isFalse(minion.isSilenced);
        assert.isAbove(card.type === "MINION" ? card.battlecryActions.length : 0, 0);
    });

    test("reconverted minion triggers new form deathrattle on kill", ({ assert }) => {
        const DIRECTEUR_COMMERCIAL_CARD_ID = 81;
        const targetCard = createMinionCard({ uuid: "target", attack: 1, health: 1 });
        const target = createMinionState(targetCard);

        const game = createGame(
            createGameData({
                playerOne: { health: 30 },
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), 0, target),
                },
            }),
        );

        applyReconversionToMinion(
            game,
            game.data.playerTwo,
            0,
            createReconvertParametersSnapshot({ cardId: DIRECTEUR_COMMERCIAL_CARD_ID }),
            target,
            game.data.playerOne,
        );
        killMinion(game, game.data.playerTwo, target.uuid);

        assert.equal(game.data.playerOne.health, 25);
    });

    test("reconverted minion applies passive aura from new form", ({ assert }) => {
        const SCRUM_MASTER_CARD_ID = 71;
        const devAlly = createMinionCard({
            uuid: "dev-ally",
            attack: 2,
            health: 2,
            tags: ["DEVELOPPEUR"],
        });
        const target = createMinionState(
            createMinionCard({ uuid: "target", attack: 1, health: 1 }),
        );

        const game = createGame(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        placeMinion(createEmptyBoard(), 0, createMinionState(devAlly)),
                        1,
                        target,
                    ),
                },
            }),
        );

        applyReconversionToMinion(
            game,
            game.data.playerOne,
            1,
            createReconvertParametersSnapshot({ cardId: SCRUM_MASTER_CARD_ID }),
            target,
            game.data.playerOne,
        );

        assert.equal(game.data.playerOne.board[0]!.attack, 3);
        assert.equal(game.data.playerOne.board[0]!.health, 3);
    });

    test("removes divine shield and taunt from reconverted minion", ({ assert }) => {
        const targetCard = createMinionCard({
            uuid: "target",
            attack: 2,
            health: 2,
            minionPowers: {
                hasTaunt: true,
                hasCharge: false,
                hasWindfury: false,
                isPoisonous: false,
                hasStealth: false,
                hasDivineShield: true,
            },
        });
        const target = createMinionState(targetCard);

        const game = createGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), 0, target),
                },
            }),
        );

        applyLegumeReconversion(game, "playerTwo", 0, target);

        const card = game.data.playerTwo.board[0]!.originalCard;
        assert.isFalse(card.type === "MINION" && card.minionPowers.hasTaunt);
        assert.isFalse(card.type === "MINION" && card.minionPowers.hasDivineShield);
    });

    test("executeAction applies targeted reconversion", ({ assert }) => {
        const targetCard = createMinionCard({ uuid: "target", attack: 6, health: 6 });
        const target = createMinionState(targetCard);

        const game = createGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), 0, target),
                },
            }),
        );

        executeAction(
            createCardActionSnapshot({
                type: "RECONVERSION",
                isTargeted: true,
                reconvertParameters: legumeParameters(),
                target: createMinionTargetSnapshot("ALL"),
            }),
            game,
            game.data.playerOne,
            game.data.playerTwo,
            { minionUuid: "target", owner: "OPPONENT" },
        );

        assertBoardIndex(assert, game, "playerTwo", 0, {
            attack: 1,
            health: 1,
            maxHealth: 1,
        });
        assert.equal(game.data.playerTwo.board[0]!.originalCard.cardId, LEGUME_CARD_ID);
    });

    test("reconverts into a random minion matching absolute cost filter", ({ assert }) => {
        const targetCost = 4;
        const expectedCardIds = getCollectibleMinionCardTemplates()
            .filter((template) => template.cost === targetCost)
            .map((template) => template.cardId);

        const targetCard = createMinionCard({ uuid: "target", cost: 6, attack: 6, health: 6 });
        const target = createMinionState(targetCard);

        const game = createGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), 0, target),
                },
            }),
        );

        applyReconversionToMinion(
            game,
            game.data.playerTwo,
            0,
            createReconvertParametersSnapshot({
                comparison: createComparisonSnapshot({
                    costComparison: "=",
                    cost: targetCost,
                }),
            }),
            target,
            game.data.playerOne,
        );

        const reconverted = game.data.playerTwo.board[0]!.originalCard;
        assert.include(expectedCardIds, reconverted.cardId);
        assert.equal(reconverted.cost, targetCost);
    });

    test("reconverts with relative cost offset from targeted minion", ({ assert }) => {
        const sourceCost = 5;
        const expectedCost = sourceCost - 1;
        const expectedCardIds = getCollectibleMinionCardTemplates()
            .filter((template) => template.cost === expectedCost)
            .map((template) => template.cardId);

        const targetCard = createMinionCard({
            uuid: "target",
            cost: sourceCost,
            attack: 3,
            health: 3,
        });
        const target = createMinionState(targetCard);

        const game = createGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), 0, target),
                },
            }),
        );

        applyReconversionToMinion(
            game,
            game.data.playerTwo,
            0,
            createReconvertParametersSnapshot({
                comparison: createComparisonSnapshot({
                    costComparison: "=",
                    cost: -1,
                }),
                relativeToSource: true,
            }),
            target,
            game.data.playerOne,
        );

        const reconverted = game.data.playerTwo.board[0]!.originalCard;
        assert.include(expectedCardIds, reconverted.cardId);
        assert.equal(reconverted.cost, expectedCost);
    });

    test("reconverts using base cost when effective cost was reduced", ({ assert }) => {
        const baseCost = 6;
        const effectiveCost = 3;
        const expectedCost = baseCost - 1;
        const expectedCardIds = getCollectibleMinionCardTemplates()
            .filter((template) => template.cost === expectedCost)
            .map((template) => template.cardId);

        assert.isAbove(expectedCardIds.length, 0);

        const targetCard = createMinionCard({
            uuid: "giant",
            baseCost,
            cost: effectiveCost,
            attack: 4,
            health: 4,
        });
        const target = createMinionState(targetCard);

        const game = createGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), 0, target),
                },
            }),
        );

        applyReconversionToMinion(
            game,
            game.data.playerTwo,
            0,
            createReconvertParametersSnapshot({
                comparison: createComparisonSnapshot({
                    costComparison: "=",
                    cost: -1,
                }),
                relativeToSource: true,
            }),
            target,
            game.data.playerOne,
        );

        const reconverted = game.data.playerTwo.board[0]!.originalCard;
        assert.include(expectedCardIds, reconverted.cardId);
        assert.equal(reconverted.cost, expectedCost);
    });

    test("mass reconversion applies relative cost per minion", ({ assert }) => {
        const minionFive = createMinionState(
            createMinionCard({ uuid: "cost-5", cost: 5, attack: 5, health: 5 }),
        );
        const minionThree = createMinionState(
            createMinionCard({ uuid: "cost-3", cost: 3, attack: 3, health: 3 }),
        );

        const game = createGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(
                        placeMinion(createEmptyBoard(), 0, minionFive),
                        1,
                        minionThree,
                    ),
                },
            }),
        );

        applyReconversionToAllMinions(
            game,
            game.data.playerOne,
            game.data.playerTwo,
            createMinionTargetSnapshot("OPPONENT", { type: "MINION" }),
            createReconvertParametersSnapshot({
                comparison: createComparisonSnapshot({
                    costComparison: "=",
                    cost: -1,
                }),
                relativeToSource: true,
            }),
        );

        assert.equal(game.data.playerTwo.board[0]!.originalCard.cost, 4);
        assert.equal(game.data.playerTwo.board[1]!.originalCard.cost, 2);
    });

    test("falls back to same cost when relative negative offset has no lower minions", ({
        assert,
    }) => {
        const sourceCost = 1;
        const expectedCardIds = getCollectibleMinionCardTemplates()
            .filter((template) => template.cost === sourceCost)
            .map((template) => template.cardId);

        const targetCard = createMinionCard({
            uuid: "target",
            cardId: 9999,
            cost: sourceCost,
            attack: 5,
            health: 5,
        });
        const target = createMinionState(targetCard);

        const game = createGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), 0, target),
                },
            }),
        );

        applyReconversionToMinion(
            game,
            game.data.playerTwo,
            0,
            createReconvertParametersSnapshot({
                comparison: createComparisonSnapshot({
                    costComparison: "=",
                    cost: -1,
                }),
                relativeToSource: true,
            }),
            target,
            game.data.playerOne,
        );

        const reconverted = game.data.playerTwo.board[0]!.originalCard;
        assert.include(expectedCardIds, reconverted.cardId);
        assert.equal(reconverted.cost, sourceCost);
        assert.notEqual(reconverted.cardId, targetCard.cardId);
    });

    test("does nothing when no catalog minion matches filter", ({ assert }) => {
        const targetCard = createMinionCard({ uuid: "target", cost: 2, attack: 2, health: 2 });
        const target = createMinionState(targetCard);

        const game = createGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), 0, target),
                },
            }),
        );

        applyReconversionToMinion(
            game,
            game.data.playerTwo,
            0,
            createReconvertParametersSnapshot({
                comparison: createComparisonSnapshot({
                    costComparison: "=",
                    cost: 100,
                }),
            }),
            target,
            game.data.playerOne,
        );

        assert.equal(game.data.playerTwo.board[0]!.originalCard.cardId, targetCard.cardId);
        assert.equal(game.data.playerTwo.board[0]!.attack, 2);
    });
});

const CURRENT_ROUND = 3;
const PARISIEN_PRESSE_CARD_ID = 87;

const leveeDeFondsParameters = () =>
    createReconvertParametersSnapshot({
        comparison: createComparisonSnapshot({ costComparison: "=", cost: 2 }),
        relativeToSource: true,
    });

const createLeveeDeFondsSpell = () =>
    createSpellCard({
        cost: 1,
        spellActions: [
            createCardActionSnapshot({
                type: "RECONVERSION",
                isTargeted: true,
                reconvertParameters: leveeDeFondsParameters(),
                target: createMinionTargetSnapshot("PLAYER"),
            }),
        ],
    });

const reconvertAllyMinion = (
    allyMinion: ReturnType<typeof createMinionCard>,
    reconvertParameters: ReturnType<typeof createReconvertParametersSnapshot>,
    options: { placedAtRound?: number; currentRound?: number } = {},
) => {
    const currentRound = options.currentRound ?? CURRENT_ROUND;
    const placedAtRound = options.placedAtRound ?? 1;
    const allyState = createMinionState(allyMinion, { placedAtRound });

    const game = createGame(
        createGameData({
            currentRound,
            playerOne: {
                board: placeMinion(createEmptyBoard(), 0, allyState),
            },
        }),
    );

    applyReconversionToMinion(
        game,
        game.data.playerOne,
        0,
        reconvertParameters,
        game.data.playerOne.board[0]!,
        game.data.playerOne,
    );

    return game;
};

test.group("RECONVERSION summoning sickness", () => {
    test("sets placedAtRound to current round after reconversion", ({ assert }) => {
        const allyMinion = createMinionCard({ uuid: "ally-minion", attack: 2, health: 2, cost: 1 });

        const game = reconvertAllyMinion(allyMinion, legumeParameters());

        assertBoardIndex(assert, game, "playerOne", 0, { placedAtRound: CURRENT_ROUND });
    });

    test("reconverted ally without charge cannot attack hero same turn", async ({ assert }) => {
        const allyMinion = createMinionCard({ uuid: "ally-minion", attack: 4, health: 5 });

        const gameAfterReconversion = reconvertAllyMinion(allyMinion, legumeParameters());

        const { game } = await runMinionActionOnGameInMemory(gameAfterReconversion, "playerOne", {
            minionId: "ally-minion",
            minionUuid: null,
            owner: "OPPONENT",
        });

        assertError(assert, "Ce monstre n'est pas encore prêt à attaquer");
        assertPlayerHealth(assert, game, "playerTwo", DEFAULT_HERO_HEALTH);
    });

    test("reconverted ally without charge cannot attack minion same turn", async ({ assert }) => {
        const allyMinion = createMinionCard({ uuid: "ally-minion", attack: 4, health: 5 });
        const defenderCard = createMinionCard({ uuid: "defender", attack: 1, health: 3 });

        const gameAfterReconversion = createGame(
            createGameData({
                currentRound: CURRENT_ROUND,
                playerOne: {
                    board: placeMinion(
                        createEmptyBoard(),
                        0,
                        createMinionState(allyMinion, { placedAtRound: 1 }),
                    ),
                },
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(defenderCard)),
                },
            }),
        );

        applyReconversionToMinion(
            gameAfterReconversion,
            gameAfterReconversion.data.playerOne,
            0,
            legumeParameters(),
            gameAfterReconversion.data.playerOne.board[0]!,
            gameAfterReconversion.data.playerOne,
        );

        await runMinionActionOnGameInMemory(gameAfterReconversion, "playerOne", {
            minionId: "ally-minion",
            minionUuid: "defender",
            owner: "OPPONENT",
        });

        assertError(assert, "Ce monstre n'est pas encore prêt à attaquer");
        assertBoardIndex(assert, gameAfterReconversion, "playerOne", 0, { health: 1 });
        assertBoardIndex(assert, gameAfterReconversion, "playerTwo", 0, { health: 3 });
    });

    test("reconverted ally with charge can attack hero same turn", async ({ assert }) => {
        const allyMinion = createMinionCard({ uuid: "ally-charge", attack: 4, health: 5 });

        const gameAfterReconversion = reconvertAllyMinion(
            allyMinion,
            createReconvertParametersSnapshot({ cardId: PARISIEN_PRESSE_CARD_ID }),
        );

        const { game } = await runMinionActionOnGameInMemory(gameAfterReconversion, "playerOne", {
            minionId: "ally-charge",
            minionUuid: null,
            owner: "OPPONENT",
        });

        assertPlayerHealth(assert, game, "playerTwo", DEFAULT_HERO_HEALTH - 2);
    });

    test("reconverted ally with charge can attack minion same turn", async ({ assert }) => {
        const allyMinion = createMinionCard({ uuid: "ally-charge", attack: 4, health: 5 });
        const defenderCard = createMinionCard({ uuid: "defender", attack: 1, health: 3 });

        const gameAfterReconversion = createGame(
            createGameData({
                currentRound: CURRENT_ROUND,
                playerOne: {
                    board: placeMinion(
                        createEmptyBoard(),
                        0,
                        createMinionState(allyMinion, { placedAtRound: 1 }),
                    ),
                },
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(defenderCard)),
                },
            }),
        );

        applyReconversionToMinion(
            gameAfterReconversion,
            gameAfterReconversion.data.playerOne,
            0,
            createReconvertParametersSnapshot({ cardId: PARISIEN_PRESSE_CARD_ID }),
            gameAfterReconversion.data.playerOne.board[0]!,
            gameAfterReconversion.data.playerOne,
        );

        await runMinionActionOnGameInMemory(gameAfterReconversion, "playerOne", {
            minionId: "ally-charge",
            minionUuid: "defender",
            owner: "OPPONENT",
        });

        assertBoardIndex(assert, gameAfterReconversion, "playerTwo", 0, { health: 1 });
    });

    test("levée de fonds uses catalog cost after git revert cost reduction", ({ assert }) => {
        const printedCost = 4;
        const reducedCost = 2;
        const expectedCost = printedCost + 2;
        const expectedCardIds = getCollectibleMinionCardTemplates()
            .filter((template) => template.cost === expectedCost)
            .map((template) => template.cardId);

        assert.isAbove(expectedCardIds.length, 0);

        const allyMinion = createMinionCard({
            uuid: "git-reverted-ally",
            cardId: 67,
            baseCost: reducedCost,
            cost: reducedCost,
            attack: 3,
            health: 4,
        });
        const spell = createLeveeDeFondsSpell();

        const { game } = runSpellEffect(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [spell],
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(allyMinion)),
                },
            }),
            spell,
            { actionTarget: { minionUuid: "git-reverted-ally", owner: "PLAYER" } },
        );

        const reconverted = game.data.playerOne.board[0]!.originalCard;
        assert.include(expectedCardIds, reconverted.cardId);
        assert.equal(reconverted.cost, expectedCost);
    });

    test("levée de fonds reconversion sets placedAtRound on ally", ({ assert }) => {
        const allyMinion = createMinionCard({ uuid: "funded-ally", attack: 3, health: 3, cost: 1 });
        const spell = createLeveeDeFondsSpell();

        const { game: gameAfterReconversion } = runSpellEffect(
            createGameData({
                currentRound: CURRENT_ROUND,
                playerOne: {
                    mana: 10,
                    hand: [spell],
                    board: placeMinion(
                        createEmptyBoard(),
                        0,
                        createMinionState(allyMinion, { placedAtRound: 1 }),
                    ),
                },
            }),
            spell,
            { actionTarget: { minionUuid: "funded-ally", owner: "PLAYER" } },
        );

        assertBoardIndex(assert, gameAfterReconversion, "playerOne", 0, {
            placedAtRound: CURRENT_ROUND,
        });
    });
});

const coupeBudgetaireParameters = () =>
    createReconvertParametersSnapshot({
        comparison: createComparisonSnapshot({ costComparison: "=", cost: -1 }),
        relativeToSource: true,
    });

const createCoupeBudgetaireSpell = () =>
    createSpellCard({
        cost: 2,
        spellActions: [
            createCardActionSnapshot({
                type: "RECONVERSION",
                reconvertParameters: coupeBudgetaireParameters(),
                target: createMinionTargetSnapshot("OPPONENT"),
            }),
        ],
    });

const reconvertEnemyMinion = (
    enemyMinion: ReturnType<typeof createMinionCard>,
    reconvertParameters: ReturnType<typeof createReconvertParametersSnapshot> = legumeParameters(),
    options: { placedAtRound?: number; currentRound?: number } = {},
) => {
    const currentRound = options.currentRound ?? CURRENT_ROUND;
    const placedAtRound = options.placedAtRound ?? 1;
    const enemyState = createMinionState(enemyMinion, { placedAtRound });

    const game = createGame(
        createGameData({
            currentRound,
            state: "PLAYER_ONE_TURN",
            playerTwo: {
                board: placeMinion(createEmptyBoard(), 0, enemyState),
            },
        }),
    );

    applyReconversionToMinion(
        game,
        game.data.playerTwo,
        0,
        reconvertParameters,
        game.data.playerTwo.board[0]!,
        game.data.playerOne,
    );

    return game;
};

test.group("RECONVERSION enemy minion attack", () => {
    test("keeps placedAtRound when reconverted by opponent", ({ assert }) => {
        const enemyMinion = createMinionCard({ uuid: "enemy-minion", attack: 4, health: 5 });

        const game = reconvertEnemyMinion(enemyMinion);

        assertBoardIndex(assert, game, "playerTwo", 0, { placedAtRound: 1 });
    });

    test("reconverted enemy can attack hero on opponent turn same round", async ({ assert }) => {
        const enemyMinion = createMinionCard({ uuid: "enemy-minion", attack: 4, health: 5 });

        const gameAfterReconversion = reconvertEnemyMinion(enemyMinion);
        const { game: gameOnEnemyTurn } = await runPassTurnFromGame(gameAfterReconversion);

        assert.equal(gameOnEnemyTurn.data.state, "PLAYER_TWO_TURN");
        assert.equal(gameOnEnemyTurn.data.currentRound, CURRENT_ROUND);

        const { game, errors } = await runMinionActionOnGameInMemory(gameOnEnemyTurn, "playerTwo", {
            minionId: "enemy-minion",
            minionUuid: null,
            owner: "OPPONENT",
        });

        assert.deepEqual(errors, []);
        assertPlayerHealth(assert, game, "playerOne", DEFAULT_HERO_HEALTH - 1);
    });

    test("coupe budgétaire reconversion lets enemy attack on their turn", async ({ assert }) => {
        const enemyMinion = createMinionCard({ uuid: "budget-cut", attack: 5, health: 5, cost: 3 });
        const spell = createCoupeBudgetaireSpell();

        await withSeededRandom("coupe-budgetaire-reconversion", async () => {
            const { game: gameAfterReconversion } = runSpellEffect(
                createGameData({
                    currentRound: CURRENT_ROUND,
                    state: "PLAYER_ONE_TURN",
                    playerOne: { mana: 10, hand: [spell] },
                    playerTwo: {
                        board: placeMinion(
                            createEmptyBoard(),
                            0,
                            createMinionState(enemyMinion, { placedAtRound: 1 }),
                        ),
                    },
                }),
                spell,
            );

            assertBoardIndex(assert, gameAfterReconversion, "playerTwo", 0, { placedAtRound: 1 });
            assert.isAbove(gameAfterReconversion.data.playerTwo.board[0]!.attack, 0);

            const { game: gameOnEnemyTurn } = await runPassTurnFromGame(gameAfterReconversion);

            const { errors } = await runMinionActionOnGameInMemory(gameOnEnemyTurn, "playerTwo", {
                minionId: "budget-cut",
                minionUuid: null,
                owner: "OPPONENT",
            });

            assert.deepEqual(errors, []);
            assert.isBelow(gameOnEnemyTurn.data.playerOne.health, DEFAULT_HERO_HEALTH);
        });
    });
});
