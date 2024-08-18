import type { ApiGame } from "./game.types.js";

export interface SocketEventByKey {
    auth_error: { error: string };
    auth_success: { message: string };
    "game:created": { gameId: number };
    "game:update": { game: ApiGame };
}

export type SocketEventKey = keyof SocketEventByKey;
