import type { ApiGameHistoryList } from "#api_types/game_history.types";
import Game from "#models/game";
import User from "#models/user";
import type { HttpContext } from "@adonisjs/core/http";
import vine from "@vinejs/vine";
import {
    getOpponentUserId,
    serializeGameHistoryEntry,
    serializeGameHistoryUser,
} from "./serialize_game_history.js";

const GAME_HISTORY_LIMIT = 50;

const listParamsValidator = vine.compile(
    vine.object({
        userId: vine.number(),
    }),
);

export const listUserGames = async ({
    params,
    response,
}: HttpContext): Promise<ApiGameHistoryList> => {
    const { userId } = await listParamsValidator.validate(params);
    const user = await User.find(userId);

    if (!user) {
        return response.notFound({ error: "Utilisateur introuvable" }) as never;
    }

    const games = await Game.query()
        .where("isFinished", true)
        .where((query) => {
            query.where("playerOneId", userId).orWhere("playerTwoId", userId);
        })
        .orderBy("updatedAt", "desc")
        .limit(GAME_HISTORY_LIMIT);

    const opponentIds = [...new Set(games.map((game) => getOpponentUserId(game, userId)))];
    const opponents = opponentIds.length > 0 ? await User.query().whereIn("id", opponentIds) : [];
    const usersById = new Map(opponents.map((opponent) => [opponent.id, opponent]));

    return {
        user: serializeGameHistoryUser(user),
        games: games.map((game) => serializeGameHistoryEntry(game, userId, usersById)),
    };
};
