import type { NarrativeBeat } from "#api_types/game_narrative.types";
import { test } from "@japa/runner";
import {
    compactPresentationBeats,
    shouldMergeBeats,
} from "#galaguerre/game_narrative/compact_presentation_beats";
import { createGameData } from "#tests/helpers/game/fixtures";

const makeBeat = (kind: NarrativeBeat["kind"], id: string): NarrativeBeat => ({
    id,
    kind,
    effects: [],
    stateAfter: createGameData(),
});

test.group("compactPresentationBeats", () => {
    test("merges combat resolution into a single attack scene", async ({ assert }) => {
        const attack = makeBeat("ATTACK", "attack");
        const death = makeBeat("MINION_DEATH", "death");
        const deathrattle = makeBeat("TRIGGER", "deathrattle");

        const compacted = compactPresentationBeats([attack, death, deathrattle]);

        assert.equal(compacted.length, 1);
        assert.equal(compacted[0]!.kind, "ATTACK");
    });

    test("keeps play card and battlecry as separate beats", async ({ assert }) => {
        const play = makeBeat("PLAY_CARD", "play");
        const battlecry = makeBeat("TRIGGER", "battlecry");

        const compacted = compactPresentationBeats([play, battlecry]);

        assert.equal(compacted.length, 2);
        assert.isFalse(shouldMergeBeats(play, battlecry));
    });

    test("does not merge standalone turn beats", async ({ assert }) => {
        const attack = makeBeat("ATTACK", "attack");
        const turn = makeBeat("TURN_BEGIN", "turn");

        const compacted = compactPresentationBeats([attack, turn]);

        assert.equal(compacted.length, 2);
    });
});
