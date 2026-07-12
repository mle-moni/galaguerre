import type { GamePresentationUpdate } from "#api_types/game_narrative.types";
import { filterPresentationForUser } from "#shared/narrative/filter_presentation_for_user";
import { createGameData, createMinionCard } from "#tests/helpers/game/fixtures";
import { test } from "@japa/runner";

const buildPresentationWithMissingPlayerArrays = (): GamePresentationUpdate => {
    const stateBefore = createGameData({
        playerOne: {
            hand: [createMinionCard({ uuid: "card-1" })],
            deckCards: [createMinionCard({ uuid: "deck-1" })],
        },
    });
    const stateAfter = createGameData({
        playerOne: {
            hand: [],
            deckCards: [createMinionCard({ uuid: "deck-1" })],
        },
    });

    delete (stateBefore.playerOne as { hand?: unknown }).hand;
    delete (stateBefore.playerOne as { deckCards?: unknown }).deckCards;
    delete (stateAfter.playerOne as { hand?: unknown }).hand;
    delete (stateAfter.playerOne as { deckCards?: unknown }).deckCards;

    return {
        updateId: "update-1",
        stateBefore,
        stateAfter,
        beats: [
            {
                id: "beat-1",
                kind: "PLAY_CARD",
                effects: [],
                stateAfter,
            },
        ],
    };
};

test.group("filterPresentationForUser", () => {
    test("normalizes missing hand and deckCards for perspective player", ({ assert }) => {
        const presentation = buildPresentationWithMissingPlayerArrays();
        const playerOneUserId = presentation.stateBefore.playerOne.userId;

        const filtered = filterPresentationForUser(presentation, playerOneUserId);

        assert.isArray(filtered.stateBefore.playerOne.hand);
        assert.isArray(filtered.stateBefore.playerOne.deckCards);
        assert.isArray(filtered.stateAfter.playerOne.hand);
        assert.isArray(filtered.stateAfter.playerOne.deckCards);
        assert.isArray(filtered.beats[0]!.stateAfter.playerOne.hand);
        assert.isArray(filtered.beats[0]!.stateAfter.playerOne.deckCards);
    });

    test("normalizes missing hand and deckCards for opponent view", ({ assert }) => {
        const presentation = buildPresentationWithMissingPlayerArrays();
        const opponentUserId = presentation.stateBefore.playerTwo.userId;

        const filtered = filterPresentationForUser(presentation, opponentUserId);

        assert.isArray(filtered.stateBefore.playerOne.hand);
        assert.isArray(filtered.stateBefore.playerOne.deckCards);
        assert.isArray(filtered.stateAfter.playerOne.hand);
        assert.isArray(filtered.stateAfter.playerOne.deckCards);
    });
});
