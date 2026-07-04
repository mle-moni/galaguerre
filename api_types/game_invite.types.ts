export interface ApiGameInvite {
    id: number;
    fromUserId: number;
    fromPseudo: string | null;
    createdAt: string;
}

export interface ApiSentGameInvite {
    id: number;
    toUserId: number;
    toPseudo: string | null;
    createdAt: string;
}

export interface CreateGameInvitePayload {
    toUserId: number;
}

export interface CreateGameInviteResponse {
    invite: ApiSentGameInvite;
}
