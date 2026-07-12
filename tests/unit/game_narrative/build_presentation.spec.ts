import type { GameData } from "#api_types/game.types";
import { test } from "@japa/runner";
import { buildPresentationForUser } from "#galaguerre/game_narrative/build_presentation_update";
import {
    createGameNarrativeRecorder,
    GameNarrativeRecorder,
} from "#galaguerre/game_narrative/game_narrative_recorder";
import { createGameData, createMinionCard, createSpellCard } from "#tests/helpers/game/fixtures";
import type { DateTime } from "luxon";

const createMockGame = (data: GameData) => ({
    data,
    updatedAt: { toISO: () => "2026-06-20T12:00:00.000Z" } as DateTime<true>,
});

test.group("GameNarrativeRecorder", () => {
    test("builds a presentation update with ordered beats and checkpoints", async ({ assert }) => {
        const recorder = createGameNarrativeRecorder();
        const initialData = createGameData({
            playerOne: { mana: 5, hand: [createMinionCard({ uuid: "card-1", cost: 3 })] },
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
            playerOne: {
                mana: 2,
                hand: [],
                board: [
                    {
                        uuid: "card-1",
                        health: 2,
                        attack: 2,
                        maxHealth: 2,
                        placedAtRound: 1,
                        lastActionAtRound: 1,
                        attacksThisRound: 0,
                        originalCard: createMinionCard({ uuid: "card-1", cost: 3 }),
                    },
                ],
            },
        });
        game.data = afterPlay;
        recorder.endBeat(game);

        recorder.beginBeat("TRIGGER");
        recorder.recordEffect({
            type: "TRIGGER",
            cardUuid: "card-1",
            owner: "PLAYER",
            trigger: "BATTLECRY",
        });
        recorder.endBeat(game);

        const presentation = recorder.build(game, "update-1");
        assert.isNotNull(presentation);
        assert.equal(presentation!.beats.length, 2);
        assert.equal(presentation!.beats[0]!.kind, "PLAY_CARD");
        assert.equal(presentation!.beats[1]!.kind, "TRIGGER");
        assert.equal(presentation!.stateBefore.playerOne.hand.length, 1);
        assert.equal(presentation!.stateAfter.playerOne.mana, 2);
        assert.equal(presentation!.beats[0]!.stateAfter.playerOne.mana, 2);
    });

    test("returns null when no beats were recorded", async ({ assert }) => {
        const recorder = createGameNarrativeRecorder();
        const data = createGameData();
        recorder.reset(data);

        const presentation = recorder.build(createMockGame(data), "update-1");
        assert.isNull(presentation);
    });
});

test.group("filterPresentationForUser", () => {
    test("hides opponent hand cards in narrative checkpoints", async ({ assert }) => {
        const recorder = new GameNarrativeRecorder();
        const opponentCard = createMinionCard({ uuid: "opp-card", label: "Secret" });
        const initialData = createGameData({
            playerOne: { userId: 1 },
            playerTwo: { userId: 2, hand: [opponentCard] },
        });
        const game = createMockGame(initialData);

        recorder.reset(initialData);
        recorder.beginBeat("DRAW");
        recorder.recordEffect({ type: "DRAW", owner: "OPPONENT" });
        game.data = createGameData({
            playerOne: { userId: 1 },
            playerTwo: { userId: 2, hand: [opponentCard, createMinionCard({ uuid: "drawn" })] },
        });
        recorder.endBeat(game);

        const raw = recorder.build(game, "update-1");
        assert.isNotNull(raw);

        const forPlayerOne = buildPresentationForUser(raw!, 1);
        assert.equal(forPlayerOne.stateBefore.playerTwo.hand[0]!.label, "dummy card");
        assert.equal(forPlayerOne.beats[0]!.stateAfter.playerTwo.hand[0]!.label, "dummy card");
        assert.equal(forPlayerOne.beats[0]!.stateAfter.playerTwo.hand[1]!.label, "dummy card");
    });

    test("preserves dynamic spell costs for the viewed player in narrative checkpoints", async ({
        assert,
    }) => {
        const recorder = new GameNarrativeRecorder();
        const discountedSpell = createSpellCard({
            uuid: "discounted-spell",
            label: "Discounted Spell",
            baseCost: 4,
            cost: 2,
        });
        const remainingSpell = createSpellCard({
            uuid: "remaining-spell",
            label: "Remaining Spell",
            baseCost: 2,
            cost: 0,
        });

        const initialData = createGameData({
            playerOne: {
                userId: 1,
                mana: 5,
                hand: [discountedSpell, remainingSpell],
                nextSpellCostReduction: 2,
            },
            playerTwo: { userId: 2 },
        });
        const game = createMockGame(initialData);

        recorder.reset(initialData);
        recorder.beginBeat("PLAY_CARD");
        recorder.recordEffect({
            type: "MOVE_CARD",
            cardUuid: "discounted-spell",
            owner: "PLAYER",
            from: "HAND",
            to: { type: "DISCARD" },
        });
        recorder.recordEffect({ type: "SPEND_MANA", owner: "PLAYER", amount: 2 });

        game.data = createGameData({
            playerOne: {
                userId: 1,
                mana: 3,
                hand: [{ ...remainingSpell, cost: 2 }],
            },
            playerTwo: { userId: 2 },
        });
        recorder.endBeat(game);

        const raw = recorder.build(game, "update-1");
        assert.isNotNull(raw);

        const forPlayerOne = buildPresentationForUser(raw!, 1);
        assert.equal(forPlayerOne.beats[0]!.stateAfter.playerOne.hand[0]!.cost, 2);
        assert.equal(forPlayerOne.stateAfter.playerOne.hand[0]!.cost, 2);
    });
});
