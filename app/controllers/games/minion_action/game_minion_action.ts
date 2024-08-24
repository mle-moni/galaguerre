import type { ClientSocketEventByKey } from "#api_types/socket_events";
import {
    ensureIsMyTurn,
    ensureMinionFoundInBoard,
    getGameActionInfos,
    whichPlayerAmI,
} from "../game_utils.js";
import { startMinionAction } from "./start_minion_action.js";

export const gameMinionAction = async (
    socketId: string,
    { minionId, owner, spotId }: ClientSocketEventByKey["game:minion_action"],
) => {
    const gameInfos = await getGameActionInfos(socketId);
    if (!gameInfos) return;

    const { currentGame, userId } = gameInfos;

    const isMyTurn = ensureIsMyTurn(currentGame, userId, socketId);
    if (!isMyTurn) return;
    const { player, opponent } = whichPlayerAmI(currentGame, userId);

    const minionInfos = ensureMinionFoundInBoard(player.board, minionId, "PLAYER", socketId);
    if (!minionInfos) return;

    return startMinionAction({
        minionInfos,
        game: currentGame,
        player,
        opponent,
        owner,
        spotId,
        socketId,
    });
};
