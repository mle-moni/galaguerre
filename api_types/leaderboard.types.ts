export interface ApiLeaderboardEntry {
    rank: number;
    userId: number;
    pseudo: string | null;
    avatarCardId: number;
    elo: number;
    wins: number;
    losses: number;
}

export interface ApiAiSpeedrunLeaderboardEntry {
    rank: number;
    userId: number;
    pseudo: string | null;
    avatarCardId: number;
    durationSeconds: number;
    roundCount: number;
}
