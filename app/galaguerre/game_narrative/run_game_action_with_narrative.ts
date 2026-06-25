import type { SpotOwner, GamePlayer } from "#api_types/game.types";
import type Game from "#models/game";
import { sendGameUpdate } from "#controllers/games/send_game_update";
import { buildPresentationUpdate } from "./build_presentation_update.js";
import { persistReplayStep } from "../game_replay/game_replay_buffer.js";
import { cloneGameData } from "./clone_game_data.js";
import {
    createGameNarrativeRecorder,
    type GameNarrativeRecorder,
} from "./game_narrative_recorder.js";
import { runWithNarrativeRecorderAsync } from "./narrative_context.js";

export const resolveSpotOwner = (game: Game, player: GamePlayer): SpotOwner =>
    player.userId === game.data.playerOne.userId ? "PLAYER" : "OPPONENT";

export const runGameActionWithNarrative = async (
    game: Game,
    action: (recorder: GameNarrativeRecorder) => Promise<void>,
): Promise<void> => {
    const recorder = createGameNarrativeRecorder();
    const stateBefore = cloneGameData(game.data);
    recorder.reset(stateBefore);

    await runWithNarrativeRecorderAsync(recorder, async () => {
        await action(recorder);
    });

    const presentation = buildPresentationUpdate(game, recorder);
    if (presentation) {
        await persistReplayStep(game, presentation);
    }
    recorder.clear();
    await game.save();
    sendGameUpdate(game, presentation ?? undefined);
};
