export interface SocketEventByKey {
    "game:created": { gameId: number };
    auth_error: { error: string };
    auth_success: { message: string };
}

export type SocketEventKey = keyof SocketEventByKey;
