import type { GamePresentationUpdate } from "#api_types/game_narrative.types";
import { compactReplayStep, expandReplaySteps } from "#galaguerre/game_replay/compact_replay_step";
import { createGameNarrativeRecorder } from "#galaguerre/game_narrative/game_narrative_recorder";
import { createGameData, createMinionCard } from "#tests/helpers/game/fixtures";
import { test } from "@japa/runner";
import type { DateTime } from "luxon";

const createMockGame = (data: ReturnType<typeof createGameData>) => ({
    data,
    updatedAt: { toISO: () => "2026-06-20T12:00:00.000Z" } as DateTime<true>,
});

const buildSamplePresentation = (): GamePresentationUpdate => {
    const recorder = createGameNarrativeRecorder();
    const initialData = createGameData({
        playerOne: {
            mana: 5,
            hand: [createMinionCard({ uuid: "card-1", cost: 3, label: "Gobelin" })],
            deckCards: [createMinionCard({ uuid: "deck-1" })],
        },
    });
    const game = createMockGame(initialData);

    recorder.reset(initialData);
    recorder.beginBeat("PLAY_CARD");
    recorder.recordEffect({
        type: "MOVE_CARD",
        cardUuid: "card-1",
        owner: "PLAYER",
        from: "HAND",
        to: { type: "BOARD", owner: "PLAYER", boardIndex: 0 },
    });
    recorder.recordEffect({ type: "SPEND_MANA", owner: "PLAYER", amount: 3 });

    const afterPlay = createGameData({
        currentRound: 1,
        playerOne: {
            mana: 2,
            hand: [],
            deckCards: [createMinionCard({ uuid: "deck-1" })],
            board: [
                {
                    uuid: "card-1",
                    health: 2,
                    attack: 2,
                    maxHealth: 2,
                    placedAtRound: 1,
                    lastActionAtRound: 1,
                    attacksThisRound: 0,
                    originalCard: createMinionCard({ uuid: "card-1", cost: 3, label: "Gobelin" }),
                },
            ],
        },
    });
    game.data = afterPlay;
    recorder.endBeat(game);

    const presentation = recorder.build(game, "update-1");
    if (!presentation) {
        throw new Error("Expected presentation");
    }

    presentation.stateAfter.actionLog = [
        {
            id: "log-1",
            roundNumber: 1,
            type: "PLAY_CARD",
            playerId: 1,
            card: createMinionCard({ uuid: "card-1", label: "Gobelin" }),
        },
    ];
    presentation.beats[0]!.stateAfter.actionLog = presentation.stateAfter.actionLog;

    return presentation;
};

test.group("compact replay step", () => {
    test("round-trips step 0 with stateBefore, actionLog and deckCards restored", ({ assert }) => {
        const original = buildSamplePresentation();
        const compact = compactReplayStep(original, 0);
        const [expanded] = expandReplaySteps([compact]);

        assert.isDefined(compact.stateBefore);
        assert.isUndefined(compactReplayStep(original, 1).stateBefore);
        assert.deepEqual(expanded.stateBefore, original.stateBefore);
        assert.deepEqual(expanded.stateAfter, original.stateAfter);
        assert.equal(expanded.beats.length, original.beats.length);
        assert.deepEqual(expanded.beats[0]!.stateAfter, original.beats[0]!.stateAfter);
        assert.equal(expanded.beats[0]!.stateAfter.actionLog.length, 1);
        assert.equal(expanded.beats[0]!.stateAfter.playerOne.deckCards.length, 1);
    });

    test("derives stateBefore for later steps from previous stateAfter", ({ assert }) => {
        const step0 = buildSamplePresentation();
        const step1 = buildSamplePresentation();
        step1.updateId = "update-2";
        step1.stateBefore = step0.stateAfter;
        step1.stateAfter = createGameData({
            currentRound: 2,
            playerOne: { mana: 10 },
        });
        step1.stateAfter.actionLog = [
            ...step0.stateAfter.actionLog,
            {
                id: "log-2",
                roundNumber: 2,
                type: "PASS_TURN",
                playerId: 1,
            },
        ];

        const expanded = expandReplaySteps([
            compactReplayStep(step0, 0),
            compactReplayStep(step1, 1),
        ]);

        assert.equal(expanded.length, 2);
        assert.deepEqual(expanded[1]!.stateBefore, step0.stateAfter);
        assert.deepEqual(expanded[1]!.stateAfter.actionLog, step1.stateAfter.actionLog);
    });

    test("strips ephemeral fields from stored snapshots", ({ assert }) => {
        const original = buildSamplePresentation();
        original.stateBefore.turnEndsAt = Date.now();
        original.stateAfter.ratingResult = {
            playerOne: { eloBefore: 1000, eloAfter: 1010, delta: 10 },
            playerTwo: { eloBefore: 1000, eloAfter: 990, delta: -10 },
        };

        const compact = compactReplayStep(original, 0);

        assert.isUndefined(compact.stateBefore!.turnEndsAt);
        assert.isUndefined(compact.stateAfter.ratingResult);
        assert.equal(compact.beats[0]!.stateAfter.actionLog.length, 0);
        assert.equal(compact.beats[0]!.stateAfter.playerOne.deckCards.length, 0);
    });
});
