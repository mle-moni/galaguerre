import type { ClientSocketEventByKey } from "#api_types/socket_events";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import {
    ensureIsMyTurn,
    ensureMinionFoundInBoard,
    getGameActionInfos,
    whichPlayerAmI,
} from "../game_utils.js";
import { minionToHeroAction } from "./minion_to_hero_action.js";
import { minionToMinionAction } from "./minion_to_minion_action.js";

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

    if (minionInfos.minion.placedAtRound === currentGame.data.currentRound) {
        emitSocketEvent(
            "notify_error",
            {
                error: "Ce serviteur n'est pas encore prêt à attaquer",
            },
            socketId,
        );
        return;
    }

    if (minionInfos.minion.lastActionAtRound === currentGame.data.currentRound) {
        emitSocketEvent(
            "notify_error",
            {
                error: "Ce serviteur a déjà attaqué ce tour",
            },
            socketId,
        );
        return;
    }

    if (spotId === null) {
        return minionToHeroAction({
            minionInfos,
            game: currentGame,
            player,
            opponent,
            owner,
            socketId,
        });
    }

    return minionToMinionAction({
        minionInfos,
        game: currentGame,
        player,
        opponent,
        owner,
        spotId,
        socketId,
    });
};
