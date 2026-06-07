import type { ClientSocketEventByKey } from "#api_types/socket_events";
import { gameMinionAction } from "#controllers/games/minion_action/game_minion_action";
import { passGameTurn } from "#controllers/games/pass_game_turn";
import { gamePlayCard } from "#controllers/games/play_card/game_play_card";
import { gameWeaponAction } from "#controllers/games/weapon_action/game_weapon_action";
import type Game from "#models/game";
import { addAiSocketData, removeSocketData } from "#services/sockets/sockets_data";
import type { AiMove } from "./enumerate_ai_moves.js";

const getUpdatedAtMillis = (game: Game): number => game.updatedAt?.toMillis() ?? 0;

export const tryAiAction = async (game: Game, socketId: string, move: AiMove): Promise<boolean> => {
    const updatedAtBefore = getUpdatedAtMillis(game);

    switch (move.type) {
        case "play_card":
            await gamePlayCard(socketId, move.action);
            break;
        case "minion_action":
            await gameMinionAction(socketId, move.action);
            break;
        case "weapon_action":
            await gameWeaponAction(socketId, move.action);
            break;
        case "pass_turn":
            await passGameTurn(socketId);
            break;
    }

    await game.refresh();

    if (game.isFinished) return true;

    return getUpdatedAtMillis(game) > updatedAtBefore;
};

export const createAiSocketId = (gameId: number): string => `ai-${gameId}`;

export const withAiSocket = async <T>(
    gameId: number,
    aiUserId: number,
    fn: (socketId: string) => Promise<T>,
): Promise<T> => {
    const socketId = createAiSocketId(gameId);
    addAiSocketData(socketId, aiUserId, gameId);

    try {
        return await fn(socketId);
    } finally {
        removeSocketData(socketId);
    }
};

export type { ClientSocketEventByKey };
