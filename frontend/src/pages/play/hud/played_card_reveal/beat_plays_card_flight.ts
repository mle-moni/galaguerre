import type { NarrativeBeat } from "#api_types/game_narrative.types";

/** True when the beat already choreographs a CARD_FLIGHT overlay animation. */
export const beatPlaysCardFlight = (beat: NarrativeBeat): boolean =>
    beat.effects.some(
        (effect) =>
            (effect.type === "MOVE_CARD" && effect.from === "HAND") ||
            effect.type === "OVERDRAW" ||
            effect.type === "SUMMON",
    );
