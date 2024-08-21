import type { ApiGame, MinionSpotId, SpotOwner } from "./game.types.js";

export interface SocketEventByKey {
    notify_error: { error: string };
    notify_success: { message: string };
    auth_error: { error: string };
    auth_success: { message: string };
    "game:created": { gameId: number };
    "game:update": { game: ApiGame };
}

export type SocketEventKey = keyof SocketEventByKey;

export interface ClientSocketEventByKey {
    "game:play_card": { cardId: string; spotId: MinionSpotId; owner: SpotOwner };
}

export type ClientSocketEventKey = keyof ClientSocketEventByKey;
