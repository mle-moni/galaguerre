import { ensureIsMyTurn, getGameActionInfos } from "./game_utils.js";
import { setupNextGameTurn } from "./setup_next_game_turn.js";

export const passGameTurn = async (socketId: string) => {
    const gameInfos = await getGameActionInfos(socketId);
    if (!gameInfos) return;

    const { currentGame, userId } = gameInfos;
    const isMyTurn = ensureIsMyTurn(currentGame, userId, socketId);
    if (!isMyTurn) return;

    await setupNextGameTurn(currentGame);
};
