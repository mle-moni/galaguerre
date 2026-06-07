export interface ApiLeaderboardEntry {
    rank: number;
    userId: number;
    pseudo: string | null;
    elo: number;
    wins: number;
    losses: number;
}
