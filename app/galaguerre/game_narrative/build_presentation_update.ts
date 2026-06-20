import type { GamePresentationUpdate } from "#api_types/game_narrative.types";
import type Game from "#models/game";
import { filterPresentationForUser } from "./filter_presentation_for_user.js";
import type { GameNarrativeRecorder } from "./game_narrative_recorder.js";

export const buildPresentationUpdate = (
    game: Game,
    recorder: GameNarrativeRecorder,
): GamePresentationUpdate | null => {
    const updateId =
        typeof game.updatedAt?.toISO === "function" ? game.updatedAt.toISO()! : String(Date.now());
    return recorder.build(game, updateId);
};

export const buildPresentationForUser = (
    presentation: GamePresentationUpdate,
    forUserId: number,
): GamePresentationUpdate => filterPresentationForUser(presentation, forUserId);
