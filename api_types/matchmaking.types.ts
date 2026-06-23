export interface GameSearchResponse {
    message: string;
    searchSessionId?: string;
}

export interface CancelGameSearchRequest {
    searchSessionId: string;
}

export interface CancelGameSearchResponse {
    message: string;
}

export interface GameSearchHeartbeatRequest {
    searchSessionId: string;
}

export type GameSearchHeartbeatResponse =
    | { status: "searching" }
    | { status: "idle" }
    | { status: "matched"; gameId: number };
