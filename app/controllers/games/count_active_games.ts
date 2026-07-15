import type { ActiveGamesCountResponse } from "#api_types/matchmaking.types";
import Game from "#models/game";

export const countActiveGames = async (): Promise<ActiveGamesCountResponse> => {
    const result = await Game.query().where("isFinished", false).count("* as total");

    return { count: Number(result[0].$extras.total) };
};
