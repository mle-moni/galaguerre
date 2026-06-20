import { AsyncLocalStorage } from "node:async_hooks";
import type { GameNarrativeRecorder } from "./game_narrative_recorder.js";

const narrativeStorage = new AsyncLocalStorage<GameNarrativeRecorder>();

export const runWithNarrativeRecorder = <T>(recorder: GameNarrativeRecorder, fn: () => T): T =>
    narrativeStorage.run(recorder, fn);

export const runWithNarrativeRecorderAsync = <T>(
    recorder: GameNarrativeRecorder,
    fn: () => Promise<T>,
): Promise<T> => narrativeStorage.run(recorder, fn);

export const getNarrativeRecorder = (): GameNarrativeRecorder | undefined =>
    narrativeStorage.getStore();

export const withNarrativeRecorder = (fn: (recorder: GameNarrativeRecorder) => void): void => {
    const recorder = narrativeStorage.getStore();
    if (recorder) fn(recorder);
};
