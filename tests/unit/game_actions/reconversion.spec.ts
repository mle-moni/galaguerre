import { test } from "@japa/runner";
import { executeAction } from "#galaguerre/action_engine/execute_action";
import { killMinion } from "#galaguerre/action_engine/kill_minion";
import {
    applyReconversionToAllMinions,
    applyReconversionToMinion,
} from "#galaguerre/action_engine/apply_reconversion";
import { applyBoostToMinion } from "#galaguerre/action_engine/apply_boost";
import { refreshAurasAfterMinionPlayed } from "#galaguerre/passive_engine/refresh_passive_auras";
import { getAllMinionCardTemplates } from "#galaguerre/card_catalog";
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
    placeMinion,
} from "#tests/helpers/game/fixtures";
import { assertBoardSpot } from "#tests/helpers/game/assertions";
import { createInMemoryGame } from "#tests/helpers/game/in_memory_game";

const createGame = (data: ReturnType<typeof createGameData>) => createInMemoryGame(data);

const LEGUME_CARD_ID = 121;

const legumeParameters = () => createReconvertParametersSnapshot({ cardId: LEGUME_CARD_ID });

const applyLegumeReconversion = (
    game: ReturnType<typeof createInMemoryGame>,
    owner: "playerOne" | "playerTwo",
    spotId: "SPOT_1" | "SPOT_2" | "SPOT_3" | "SPOT_4" | "SPOT_5",
    sourceMinion: ReturnType<typeof createMinionState>,
) => {
    applyReconversionToMinion(game, game.data[owner], spotId, legumeParameters(), sourceMinion);
};

test.group("RECONVERSION action", () => {
    test("transforms buffed minion into Légume 1/1 with full health", ({ assert }) => {
        const targetCard = createMinionCard({ uuid: "target", attack: 5, health: 5, cardId: 10 });
        const target = createMinionState(targetCard);
        applyBoostToMinion(target, createBoostSnapshot({ attack: 2, health: 2 }));

        const game = createGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), "SPOT_1", target),
                },
            }),
        );

        applyLegumeReconversion(game, "playerTwo", "SPOT_1", target);

        assertBoardSpot(assert, game, "playerTwo", "SPOT_1", {
            attack: 1,
            health: 1,
            maxHealth: 1,
        });
        assert.equal(game.data.playerTwo.board.SPOT_1!.originalCard.cardId, LEGUME_CARD_ID);
        assert.equal(game.data.playerTwo.board.SPOT_1!.originalCard.label, "Légume");
        assert.equal(game.data.playerTwo.board.SPOT_1!.uuid, "target");
    });

    test("reconverted minion keeps all effects of the new card form", ({ assert }) => {
        const DIRECTEUR_COMMERCIAL_CARD_ID = 81;
        const targetCard = createMinionCard({ uuid: "target", attack: 3, health: 3 });
        const target = createMinionState(targetCard);

        const game = createGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), "SPOT_1", target),
                },
            }),
        );

        applyReconversionToMinion(
            game,
            game.data.playerTwo,
            "SPOT_1",
            createReconvertParametersSnapshot({ cardId: DIRECTEUR_COMMERCIAL_CARD_ID }),
            target,
        );

        const minion = game.data.playerTwo.board.SPOT_1!;
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
                    board: placeMinion(createEmptyBoard(), "SPOT_1", target),
                },
            }),
        );

        applyLegumeReconversion(game, "playerTwo", "SPOT_1", target);

        assert.equal(game.data.playerTwo.deckCards.length, 1);
        assert.isNotNull(game.data.playerTwo.board.SPOT_1);
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
                    board: placeMinion(createEmptyBoard(), "SPOT_1", target),
                },
            }),
        );

        applyLegumeReconversion(game, "playerTwo", "SPOT_1", target);
        killMinion(game, game.data.playerTwo, "SPOT_1");

        assert.equal(game.data.playerOne.health, 30);
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
                        placeMinion(createEmptyBoard(), "SPOT_1", createMinionState(ally)),
                        "SPOT_2",
                        auraSourceState,
                    ),
                },
            }),
        );

        refreshAurasAfterMinionPlayed(game, game.data.playerOne, "SPOT_2");
        assert.equal(game.data.playerOne.board.SPOT_1!.attack, 3);

        applyLegumeReconversion(game, "playerOne", "SPOT_2", auraSourceState);

        assert.equal(game.data.playerOne.board.SPOT_1!.attack, 2);
        assert.equal(game.data.playerOne.board.SPOT_2!.attack, 1);
    });

    test("reconverted minion keeps innate keyword effects from new form", ({ assert }) => {
        const DEV_AIGRI_CARD_ID = 65;

        const targetCard = createMinionCard({ uuid: "target", attack: 1, health: 1 });
        const target = createMinionState(targetCard);

        const game = createGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), "SPOT_1", target),
                },
            }),
        );

        applyReconversionToMinion(
            game,
            game.data.playerTwo,
            "SPOT_1",
            createReconvertParametersSnapshot({ cardId: DEV_AIGRI_CARD_ID }),
            target,
        );

        const minion = game.data.playerTwo.board.SPOT_1!;
        const card = minion.originalCard;
        assert.equal(card.type === "MINION" ? card.cardId : -1, DEV_AIGRI_CARD_ID);
        assert.isTrue(card.type === "MINION" && card.minionPowers.hasTaunt);
        assert.isTrue(card.type === "MINION" && card.effects.includes("Provocation"));
        assert.include(
            card.type === "MINION" ? card.description : "",
            "Provocation : Les adversaires doivent attaquer ce serviteur avant les autres cibles.",
        );
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
                    board: placeMinion(createEmptyBoard(), "SPOT_1", target),
                },
            }),
        );

        applyReconversionToMinion(
            game,
            game.data.playerTwo,
            "SPOT_1",
            createReconvertParametersSnapshot({ cardId: DIRECTEUR_COMMERCIAL_CARD_ID }),
            target,
        );
        killMinion(game, game.data.playerTwo, "SPOT_1");

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
                        placeMinion(createEmptyBoard(), "SPOT_1", createMinionState(devAlly)),
                        "SPOT_2",
                        target,
                    ),
                },
            }),
        );

        applyReconversionToMinion(
            game,
            game.data.playerOne,
            "SPOT_2",
            createReconvertParametersSnapshot({ cardId: SCRUM_MASTER_CARD_ID }),
            target,
        );

        assert.equal(game.data.playerOne.board.SPOT_1!.attack, 3);
        assert.equal(game.data.playerOne.board.SPOT_1!.health, 3);
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
                    board: placeMinion(createEmptyBoard(), "SPOT_1", target),
                },
            }),
        );

        applyLegumeReconversion(game, "playerTwo", "SPOT_1", target);

        const card = game.data.playerTwo.board.SPOT_1!.originalCard;
        assert.isFalse(card.type === "MINION" && card.minionPowers.hasTaunt);
        assert.isFalse(card.type === "MINION" && card.minionPowers.hasDivineShield);
    });

    test("executeAction applies targeted reconversion", ({ assert }) => {
        const targetCard = createMinionCard({ uuid: "target", attack: 6, health: 6 });
        const target = createMinionState(targetCard);

        const game = createGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), "SPOT_1", target),
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
            { spotId: "SPOT_1", owner: "OPPONENT" },
        );

        assertBoardSpot(assert, game, "playerTwo", "SPOT_1", {
            attack: 1,
            health: 1,
            maxHealth: 1,
        });
        assert.equal(game.data.playerTwo.board.SPOT_1!.originalCard.cardId, LEGUME_CARD_ID);
    });

    test("reconverts into a random minion matching absolute cost filter", ({ assert }) => {
        const targetCost = 4;
        const expectedCardIds = getAllMinionCardTemplates()
            .filter((template) => template.cost === targetCost)
            .map((template) => template.cardId);

        const targetCard = createMinionCard({ uuid: "target", cost: 6, attack: 6, health: 6 });
        const target = createMinionState(targetCard);

        const game = createGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), "SPOT_1", target),
                },
            }),
        );

        applyReconversionToMinion(
            game,
            game.data.playerTwo,
            "SPOT_1",
            createReconvertParametersSnapshot({
                comparison: createComparisonSnapshot({
                    costComparison: "=",
                    cost: targetCost,
                }),
            }),
            target,
        );

        const reconverted = game.data.playerTwo.board.SPOT_1!.originalCard;
        assert.include(expectedCardIds, reconverted.cardId);
        assert.equal(reconverted.cost, targetCost);
    });

    test("reconverts with relative cost offset from targeted minion", ({ assert }) => {
        const sourceCost = 5;
        const expectedCost = sourceCost - 1;
        const expectedCardIds = getAllMinionCardTemplates()
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
                    board: placeMinion(createEmptyBoard(), "SPOT_1", target),
                },
            }),
        );

        applyReconversionToMinion(
            game,
            game.data.playerTwo,
            "SPOT_1",
            createReconvertParametersSnapshot({
                comparison: createComparisonSnapshot({
                    costComparison: "=",
                    cost: -1,
                }),
                relativeToSource: true,
            }),
            target,
        );

        const reconverted = game.data.playerTwo.board.SPOT_1!.originalCard;
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
                        placeMinion(createEmptyBoard(), "SPOT_1", minionFive),
                        "SPOT_2",
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

        assert.equal(game.data.playerTwo.board.SPOT_1!.originalCard.cost, 4);
        assert.equal(game.data.playerTwo.board.SPOT_2!.originalCard.cost, 2);
    });

    test("does nothing when no catalog minion matches filter", ({ assert }) => {
        const targetCard = createMinionCard({ uuid: "target", cost: 2, attack: 2, health: 2 });
        const target = createMinionState(targetCard);

        const game = createGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), "SPOT_1", target),
                },
            }),
        );

        applyReconversionToMinion(
            game,
            game.data.playerTwo,
            "SPOT_1",
            createReconvertParametersSnapshot({
                comparison: createComparisonSnapshot({
                    costComparison: "=",
                    cost: 100,
                }),
            }),
            target,
        );

        assert.equal(game.data.playerTwo.board.SPOT_1!.originalCard.cardId, targetCard.cardId);
        assert.equal(game.data.playerTwo.board.SPOT_1!.attack, 2);
    });
});
