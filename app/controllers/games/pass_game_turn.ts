import { recordPassTurn } from "../../galaguerre/game_log/record_game_log.js";
import { triggerPassives } from "../../galaguerre/passive_engine/trigger_passives.js";
import type { GamePlayer } from "#api_types/game.types";
import type Game from "#models/game";
import { ensureIsMyTurn, getGameActionInfos } from "./game_utils.js";
import { sendGameUpdate } from "./send_game_update.js";
import { setupNextGameTurn } from "./setup_next_game_turn.js";
import { terminateGame } from "./terminate_game.js";

export const performPassTurn = async (game: Game, activePlayer: GamePlayer): Promise<void> => {
    recordPassTurn(game, activePlayer);

    const { gameEnded: turnEndGameEnded } = triggerPassives(game, "TURN_END", activePlayer);

    if (turnEndGameEnded) {
        await terminateGame(game);
        return;
    }

    await game.save();
    sendGameUpdate(game);

    await setupNextGameTurn(game);
};

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

    await performPassTurn(currentGame, activePlayer);
};
