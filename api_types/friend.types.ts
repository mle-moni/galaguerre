export interface ApiFriend {
    userId: number;
    pseudo: string | null;
    elo: number;
    wins: number;
    losses: number;
    currentGameId: number | null;
}

export interface ApiFriendSearchResult extends ApiFriend {
    isFriend: boolean;
}

export interface AddFriendPayload {
    friendUserId: number;
}
