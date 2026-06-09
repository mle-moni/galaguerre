export interface ApiLeaderboardEntry {
    rank: number;
    userId: number;
    pseudo: string | null;
    elo: number;
    wins: number;
    losses: number;
}

export interface ApiAiSpeedrunLeaderboardEntry {
    rank: number;
    userId: number;
    pseudo: string | null;
    durationSeconds: number;
    roundCount: number;
}
