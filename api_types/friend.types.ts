export interface ApiFriend {
    userId: number;
    pseudo: string | null;
    avatarCardId: number;
    elo: number;
    wins: number;
    losses: number;
    level: number;
    levelTitle: string;
    currentGameId: number | null;
    lastSeenAt: string | null;
    isOnline: boolean;
}

export type FriendRequestStatus = "none" | "sent" | "received";

export interface ApiFriendSearchResult extends ApiFriend {
    isFriend: boolean;
    friendRequestStatus: FriendRequestStatus;
}

export interface AddFriendPayload {
    friendUserId: number;
}

export type AddFriendResponseStatus = "sent" | "accepted";

export interface AddFriendResponse {
    status: AddFriendResponseStatus;
    requestId: number | null;
    friend: ApiFriend | null;
}

export interface ApiFriendRequest {
    id: number;
    fromUserId: number;
    fromPseudo: string | null;
    createdAt: string;
}

export interface ApiSentFriendRequest {
    id: number;
    toUserId: number;
    toPseudo: string | null;
    createdAt: string;
}
