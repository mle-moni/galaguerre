import type { GameData } from "#api_types/game.types";
import type { NarrativeBeatKind } from "#api_types/game_narrative.types";
import { withNarrativeRecorder } from "./narrative_context.js";

type GameDataHolder = { data: GameData };

export const getLastLogEntryId = (game: GameDataHolder): string | undefined =>
    game.data.actionLog.at(-1)?.id;

export const beginLoggedBeat = (game: GameDataHolder, kind: NarrativeBeatKind): void => {
    withNarrativeRecorder((recorder) => {
        if (recorder.hasCurrentBeat()) {
            recorder.endBeat(game);
        }
        recorder.beginBeat(kind, { logEntryId: getLastLogEntryId(game) });
    });
};

export const endCurrentBeat = (game: GameDataHolder): void => {
    withNarrativeRecorder((recorder) => {
        if (!recorder.hasCurrentBeat()) return;
        recorder.endBeat(game);
    });
};

export const runLoggedBeat = (
    game: GameDataHolder,
    kind: NarrativeBeatKind,
    fn: () => void,
): void => {
    beginLoggedBeat(game, kind);
    fn();
    endCurrentBeat(game);
};
