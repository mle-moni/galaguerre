import type Game from "#models/game";
import { sendGameUpdate } from "./send_game_update.js";

export const terminateGame = async (game: Game) => {
    game.data.state = "FINISHED";
    game.isFinished = true;

    await game.save();

    sendGameUpdate(game);
};
