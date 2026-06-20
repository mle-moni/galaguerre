import type { NarrativeBeat, NarrativeBeatKind } from "#api_types/game_narrative.types";

const STANDALONE_BEAT_KINDS = new Set<NarrativeBeatKind>([
    "DRAW",
    "FATIGUE",
    "PASS_TURN",
    "TURN_BEGIN",
    "MANA_GAIN",
    "WEAPON_BREAK",
]);

/**
 * Hearthstone-style pacing: one player action resolves as a single visual scene.
 * Deaths, deathrattles and battlecries chain into the opening beat instead of
 * creating pauses between micro-checkpoints.
 */
export const shouldMergeBeats = (previous: NarrativeBeat, next: NarrativeBeat): boolean => {
    if (STANDALONE_BEAT_KINDS.has(previous.kind) || STANDALONE_BEAT_KINDS.has(next.kind)) {
        return false;
    }

    if (previous.kind === "ATTACK") {
        return true;
    }

    if (previous.kind === "MINION_DEATH" && next.kind === "TRIGGER") {
        return true;
    }

    if (previous.kind === "TRIGGER" && next.kind === "TRIGGER") {
        return true;
    }

    return false;
};

export const compactPresentationBeats = (beats: NarrativeBeat[]): NarrativeBeat[] => {
    const compacted: NarrativeBeat[] = [];

    for (const beat of beats) {
        const previous = compacted.at(-1);

        if (previous && shouldMergeBeats(previous, beat)) {
            compacted[compacted.length - 1] = {
                ...previous,
                effects: [...previous.effects, ...beat.effects],
                stateAfter: beat.stateAfter,
            };
            continue;
        }

        compacted.push({
            ...beat,
            effects: [...beat.effects],
        });
    }

    return compacted;
};
