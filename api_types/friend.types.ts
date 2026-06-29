export interface ApiFriend {
    userId: number;
    pseudo: string | null;
    elo: number;
    wins: number;
    losses: number;
}

export interface ApiFriendSearchResult extends ApiFriend {
    isFriend: boolean;
}

export interface AddFriendPayload {
    friendUserId: number;
}
