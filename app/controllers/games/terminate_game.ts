import type Game from "#models/game";
import { applyGameResult } from "#services/elo";
import { sendGameUpdate } from "./send_game_update.js";

export const terminateGame = async (game: Game) => {
    if (game.isFinished) return;

    game.data.state = "FINISHED";
    game.isFinished = true;

    await applyGameResult(game);
    await game.save();

    sendGameUpdate(game);
};
