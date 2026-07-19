import { test } from "@japa/runner";
import { executeAction } from "#galaguerre/action_engine/execute_action";
import { createGameNarrativeRecorder } from "#galaguerre/game_narrative/game_narrative_recorder";
import { runWithNarrativeRecorder } from "#galaguerre/game_narrative/narrative_context";
import { buildPresentationForUser } from "#galaguerre/game_narrative/build_presentation_update";
import { remapEffectForUser } from "#shared/narrative/remap_narrative_for_user";
import {
    createBoostSnapshot,
    createCardActionSnapshot,
    createEmptyBoard,
    createGameData,
    createMinionCard,
    createMinionState,
    createMinionTargetSnapshot,
    createReconvertParametersSnapshot,
    placeMinion,
} from "#tests/helpers/game/fixtures";
import { createInMemoryGame } from "#tests/helpers/game/in_memory_game";

const runWithBeat = (game: ReturnType<typeof createInMemoryGame>, fn: () => void) => {
    const recorder = createGameNarrativeRecorder();
    recorder.reset(game.data);
    recorder.beginBeat("TRIGGER");
    runWithNarrativeRecorder(recorder, fn);
    recorder.endBeat(game);
    return recorder.build(game, "update-1");
};

test.group("ABILITY_IMPACT narrative", () => {
    test("records PROJECTILE for targeted damage from hero source", ({ assert }) => {
        const targetCard = createMinionCard({ uuid: "target", attack: 2, health: 5 });
        const game = createInMemoryGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(targetCard)),
                },
            }),
        );

        const presentation = runWithBeat(game, () => {
            executeAction(
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 2,
                    isTargeted: true,
                    target: createMinionTargetSnapshot("OPPONENT"),
                }),
                game,
                game.data.playerOne,
                game.data.playerTwo,
                { minionUuid: "target", owner: "OPPONENT" },
            );
        });

        assert.isNotNull(presentation);
        const impact = presentation!.beats[0]!.effects.find(
            (effect) => effect.type === "ABILITY_IMPACT",
        );
        assert.isDefined(impact);
        if (impact?.type !== "ABILITY_IMPACT") throw new Error("Expected ABILITY_IMPACT");

        assert.equal(impact.kind, "DAMAGE");
        assert.equal(impact.delivery, "PROJECTILE");
        assert.deepEqual(impact.source, { type: "HERO", owner: "PLAYER" });
        assert.deepEqual(impact.targets, [
            { type: "MINION", cardUuid: "target", owner: "OPPONENT" },
        ]);
    });

    test("records PROJECTILE from board minion source when sourceMinion is provided", ({
        assert,
    }) => {
        const sourceCard = createMinionCard({ uuid: "source", attack: 2, health: 2 });
        const targetCard = createMinionCard({ uuid: "target", attack: 2, health: 5 });
        const sourceMinion = createMinionState(sourceCard);
        const game = createInMemoryGame(
            createGameData({
                playerOne: {
                    board: placeMinion(createEmptyBoard(), 0, sourceMinion),
                },
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(targetCard)),
                },
            }),
        );

        const presentation = runWithBeat(game, () => {
            executeAction(
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 2,
                    isTargeted: true,
                    target: createMinionTargetSnapshot("OPPONENT"),
                }),
                game,
                game.data.playerOne,
                game.data.playerTwo,
                { minionUuid: "target", owner: "OPPONENT" },
                0,
                sourceMinion,
            );
        });

        const impact = presentation!.beats[0]!.effects.find(
            (effect) => effect.type === "ABILITY_IMPACT",
        );
        if (impact?.type !== "ABILITY_IMPACT") throw new Error("Expected ABILITY_IMPACT");

        assert.deepEqual(impact.source, {
            type: "MINION",
            cardUuid: "source",
            owner: "PLAYER",
        });
    });

    test("records MULTI_PROJECTILE for random limited damage", ({ assert }) => {
        const game = createInMemoryGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(
                        placeMinion(
                            placeMinion(
                                createEmptyBoard(),
                                0,
                                createMinionState(
                                    createMinionCard({ uuid: "e1", attack: 1, health: 4 }),
                                ),
                            ),
                            1,
                            createMinionState(
                                createMinionCard({ uuid: "e2", attack: 1, health: 4 }),
                            ),
                        ),
                        2,
                        createMinionState(createMinionCard({ uuid: "e3", attack: 1, health: 4 })),
                    ),
                },
            }),
        );

        const presentation = runWithBeat(game, () => {
            executeAction(
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 4,
                    isTargeted: false,
                    target: createMinionTargetSnapshot("OPPONENT", {
                        maxTargets: 3,
                        targetSelectionMode: "RANDOM",
                    }),
                }),
                game,
                game.data.playerOne,
                game.data.playerTwo,
            );
        });

        const impact = presentation!.beats[0]!.effects.find(
            (effect) => effect.type === "ABILITY_IMPACT",
        );
        if (impact?.type !== "ABILITY_IMPACT") throw new Error("Expected ABILITY_IMPACT");

        assert.equal(impact.delivery, "MULTI_PROJECTILE");
        assert.equal(impact.kind, "DAMAGE");
        assert.equal(impact.targets.length, 3);
    });

    test("records AOE with enemy board zone for mass damage", ({ assert }) => {
        const game = createInMemoryGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(
                        createEmptyBoard(),
                        0,
                        createMinionState(createMinionCard({ uuid: "e1", attack: 1, health: 4 })),
                    ),
                },
            }),
        );

        const presentation = runWithBeat(game, () => {
            executeAction(
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 3,
                    isTargeted: false,
                    target: createMinionTargetSnapshot("OPPONENT"),
                }),
                game,
                game.data.playerOne,
                game.data.playerTwo,
            );
        });

        const impact = presentation!.beats[0]!.effects.find(
            (effect) => effect.type === "ABILITY_IMPACT",
        );
        if (impact?.type !== "ABILITY_IMPACT") throw new Error("Expected ABILITY_IMPACT");

        assert.equal(impact.delivery, "AOE");
        assert.deepEqual(impact.zones, [{ type: "BOARD", owner: "OPPONENT" }]);
        assert.equal(impact.targets.length, 1);
    });

    test("records AOE zones for destroy all minions", ({ assert }) => {
        const game = createInMemoryGame(
            createGameData({
                playerOne: {
                    board: placeMinion(
                        createEmptyBoard(),
                        0,
                        createMinionState(createMinionCard({ uuid: "a1", attack: 1, health: 2 })),
                    ),
                },
                playerTwo: {
                    board: placeMinion(
                        createEmptyBoard(),
                        0,
                        createMinionState(createMinionCard({ uuid: "e1", attack: 1, health: 2 })),
                    ),
                },
            }),
        );

        const presentation = runWithBeat(game, () => {
            executeAction(
                createCardActionSnapshot({
                    type: "DESTROY",
                    isTargeted: false,
                    target: createMinionTargetSnapshot("ALL"),
                }),
                game,
                game.data.playerOne,
                game.data.playerTwo,
            );
        });

        const impact = presentation!.beats[0]!.effects.find(
            (effect) => effect.type === "ABILITY_IMPACT",
        );
        if (impact?.type !== "ABILITY_IMPACT") throw new Error("Expected ABILITY_IMPACT");

        assert.equal(impact.kind, "DESTROY");
        assert.equal(impact.delivery, "AOE");
        assert.deepEqual(impact.zones, [
            { type: "BOARD", owner: "PLAYER" },
            { type: "BOARD", owner: "OPPONENT" },
        ]);
    });

    test("records CLOUD for targeted reconversion", ({ assert }) => {
        const targetCard = createMinionCard({ uuid: "target", attack: 5, health: 5 });
        const game = createInMemoryGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(targetCard)),
                },
            }),
        );

        const presentation = runWithBeat(game, () => {
            executeAction(
                createCardActionSnapshot({
                    type: "RECONVERSION",
                    isTargeted: true,
                    target: createMinionTargetSnapshot("OPPONENT"),
                    reconvertParameters: createReconvertParametersSnapshot({
                        cardId: 121,
                    }),
                }),
                game,
                game.data.playerOne,
                game.data.playerTwo,
                { minionUuid: "target", owner: "OPPONENT" },
            );
        });

        const impact = presentation!.beats[0]!.effects.find(
            (effect) => effect.type === "ABILITY_IMPACT",
        );
        if (impact?.type !== "ABILITY_IMPACT") throw new Error("Expected ABILITY_IMPACT");

        assert.equal(impact.kind, "RECONVERSION");
        assert.equal(impact.delivery, "CLOUD");
        // ABILITY_IMPACT is recorded before apply; presence is what we assert
        assert.equal(impact.targets.length, 1);
    });

    test("records STAT_CHANGE for boost and ABILITY_IMPACT projectile", ({ assert }) => {
        const targetCard = createMinionCard({ uuid: "ally", attack: 2, health: 2 });
        const game = createInMemoryGame(
            createGameData({
                playerOne: {
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(targetCard)),
                },
            }),
        );

        const presentation = runWithBeat(game, () => {
            executeAction(
                createCardActionSnapshot({
                    type: "BOOST",
                    isTargeted: true,
                    boost: createBoostSnapshot({ attack: 1, health: 1 }),
                    target: createMinionTargetSnapshot("PLAYER"),
                }),
                game,
                game.data.playerOne,
                game.data.playerTwo,
                { minionUuid: "ally", owner: "PLAYER" },
            );
        });

        const effects = presentation!.beats[0]!.effects;
        const impact = effects.find((effect) => effect.type === "ABILITY_IMPACT");
        const statChange = effects.find((effect) => effect.type === "STAT_CHANGE");

        if (impact?.type !== "ABILITY_IMPACT") throw new Error("Expected ABILITY_IMPACT");
        if (statChange?.type !== "STAT_CHANGE") throw new Error("Expected STAT_CHANGE");

        assert.equal(impact.kind, "BOOST");
        assert.equal(impact.delivery, "PROJECTILE");
        assert.equal(statChange.attackDelta, 1);
        assert.equal(statChange.healthDelta, 1);
    });

    test("records sequential ABILITY_IMPACT for silence then damage", ({ assert }) => {
        const targetCard = createMinionCard({ uuid: "target", attack: 2, health: 4 });
        const game = createInMemoryGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(targetCard)),
                },
            }),
        );

        const presentation = runWithBeat(game, () => {
            executeAction(
                createCardActionSnapshot({
                    type: "SILENCE",
                    isTargeted: true,
                    target: createMinionTargetSnapshot("OPPONENT"),
                }),
                game,
                game.data.playerOne,
                game.data.playerTwo,
                { minionUuid: "target", owner: "OPPONENT" },
            );
            executeAction(
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 1,
                    isTargeted: true,
                    target: createMinionTargetSnapshot("OPPONENT"),
                }),
                game,
                game.data.playerOne,
                game.data.playerTwo,
                { minionUuid: "target", owner: "OPPONENT" },
            );
        });

        const impacts = presentation!.beats[0]!.effects.filter(
            (effect) => effect.type === "ABILITY_IMPACT",
        );
        assert.equal(impacts.length, 2);
        if (impacts[0]?.type !== "ABILITY_IMPACT" || impacts[1]?.type !== "ABILITY_IMPACT") {
            throw new Error("Expected two ABILITY_IMPACT effects");
        }
        assert.equal(impacts[0].kind, "SILENCE");
        assert.equal(impacts[0].delivery, "PROJECTILE");
        assert.equal(impacts[1].kind, "DAMAGE");
        assert.equal(impacts[1].delivery, "PROJECTILE");
    });

    test("remaps ABILITY_IMPACT owners for player two", ({ assert }) => {
        const remapped = remapEffectForUser(
            {
                type: "ABILITY_IMPACT",
                kind: "DAMAGE",
                delivery: "PROJECTILE",
                source: { type: "HERO", owner: "PLAYER" },
                targets: [{ type: "MINION", cardUuid: "x", owner: "OPPONENT" }],
                zones: [{ type: "BOARD", owner: "OPPONENT" }],
            },
            2,
            1,
        );

        if (remapped.type !== "ABILITY_IMPACT") throw new Error("Expected ABILITY_IMPACT");
        assert.deepEqual(remapped.source, { type: "HERO", owner: "OPPONENT" });
        assert.deepEqual(remapped.targets[0], {
            type: "MINION",
            cardUuid: "x",
            owner: "PLAYER",
        });
        assert.deepEqual(remapped.zones, [{ type: "BOARD", owner: "PLAYER" }]);
    });

    test("buildPresentationForUser remaps ability impact", ({ assert }) => {
        const targetCard = createMinionCard({ uuid: "target", attack: 2, health: 5 });
        const game = createInMemoryGame(
            createGameData({
                playerOne: { userId: 1 },
                playerTwo: {
                    userId: 2,
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(targetCard)),
                },
            }),
        );

        const raw = runWithBeat(game, () => {
            executeAction(
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 2,
                    isTargeted: true,
                    target: createMinionTargetSnapshot("OPPONENT"),
                }),
                game,
                game.data.playerOne,
                game.data.playerTwo,
                { minionUuid: "target", owner: "OPPONENT" },
            );
        });

        const forPlayerTwo = buildPresentationForUser(raw!, 2);
        const impact = forPlayerTwo.beats[0]!.effects.find(
            (effect) => effect.type === "ABILITY_IMPACT",
        );
        if (impact?.type !== "ABILITY_IMPACT") throw new Error("Expected ABILITY_IMPACT");

        assert.deepEqual(impact.source, { type: "HERO", owner: "OPPONENT" });
        assert.deepEqual(impact.targets[0], {
            type: "MINION",
            cardUuid: "target",
            owner: "PLAYER",
        });
    });
});
