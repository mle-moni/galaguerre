import { triggerPassives } from "../../galaguerre/passive_engine/trigger_passives.js";
import { ensureIsMyTurn, getGameActionInfos } from "./game_utils.js";
import { sendGameUpdate } from "./send_game_update.js";
import { setupNextGameTurn } from "./setup_next_game_turn.js";
import { terminateGame } from "./terminate_game.js";

export const passGameTurn = async (socketId: string) => {
    const gameInfos = await getGameActionInfos(socketId);
    if (!gameInfos) return;

    const { currentGame, userId } = gameInfos;
    const isMyTurn = ensureIsMyTurn(currentGame, userId, socketId);
    if (!isMyTurn) return;

    const activePlayer =
        currentGame.data.state === "PLAYER_ONE_TURN"
            ? currentGame.data.playerOne
            : currentGame.data.playerTwo;

    const { gameEnded: turnEndGameEnded } = triggerPassives(
        currentGame,
        "TURN_END",
        activePlayer,
    );

    if (turnEndGameEnded) {
        await terminateGame(currentGame);
        return;
    }

    await currentGame.save();
    sendGameUpdate(currentGame);

    await setupNextGameTurn(currentGame);
};
