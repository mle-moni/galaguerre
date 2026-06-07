import type Game from "#models/game";
import { applyGameResult, getWinnerUserId } from "#services/elo";
import { sendGameUpdate } from "./send_game_update.js";

export const terminateGame = async (game: Game) => {
    if (game.isFinished) return;

    game.data.state = "FINISHED";
    game.isFinished = true;

    if (game.data.isTraining) {
        const winnerUserId = getWinnerUserId(game);
        game.winnerId = winnerUserId === game.playerOneId ? winnerUserId : null;
        await game.save();
        sendGameUpdate(game);
        return;
    }

    await applyGameResult(game);
    await game.save();

    sendGameUpdate(game);
};
