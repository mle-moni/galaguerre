import type {
    ApiAiSpeedrunLeaderboardEntry,
    ApiLeaderboardEntry,
} from "#api_types/leaderboard.types";
import { getAiSpeedrunLeaderboard } from "#services/leaderboard/get_ai_speedrun_leaderboard";
import User from "#models/user";
import type { HttpContext } from "@adonisjs/core/http";

export default class LeaderboardController {
    async index(_ctx: HttpContext): Promise<ApiLeaderboardEntry[]> {
        const users = await User.query()
            .orderBy("elo", "desc")
            .orderBy("wins", "desc")
            .orderBy("id", "asc")
            .limit(100);

        return users.map((user, index) => ({
            rank: index + 1,
            userId: user.id,
            pseudo: user.pseudo,
            elo: user.elo,
            wins: user.wins,
            losses: user.losses,
        }));
    }

    async aiSpeedrun(_ctx: HttpContext): Promise<ApiAiSpeedrunLeaderboardEntry[]> {
        return getAiSpeedrunLeaderboard();
    }
}
