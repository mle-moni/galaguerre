export interface ApiUser {
    id: number;
    pseudo: string | null;
    email: string;
    socketToken: string;
    currentGameId: number | null;
    matchmakingSearchSessionId: string | null;
    elo: number;
    wins: number;
    losses: number;
    onboardingCompletedAt: string | null;
}
