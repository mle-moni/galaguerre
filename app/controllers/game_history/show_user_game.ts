import type { ApiGameHistoryDetail } from "#api_types/game_history.types";
import Game from "#models/game";
import User from "#models/user";
import type { HttpContext } from "@adonisjs/core/http";
import vine from "@vinejs/vine";
import { gameHasReplayRecord } from "#galaguerre/game_replay/game_replay_buffer";
import {
    getGameResult,
    getOpponentUserId,
    getRatingResult,
    isGameParticipant,
    serializeGameHistoryPlayer,
    serializeGameHistoryUser,
} from "./serialize_game_history.js";
import { getGameFinishedAtIso } from "../../galaguerre/game/get_game_finished_at.js";

const showParamsValidator = vine.compile(
    vine.object({
        userId: vine.number(),
        gameId: vine.number(),
    }),
);

export const showUserGame = async ({
    params,
    response,
}: HttpContext): Promise<ApiGameHistoryDetail> => {
    const { userId, gameId } = await showParamsValidator.validate(params);
    const user = await User.find(userId);

    if (!user) {
        return response.notFound({ error: "Utilisateur introuvable" }) as never;
    }

    const game = await Game.find(gameId);

    if (!game || !game.isFinished || !isGameParticipant(game, userId)) {
        return response.notFound({ error: "Partie introuvable" }) as never;
    }

    const opponentUserId = getOpponentUserId(game, userId);
    const opponentUser = await User.find(opponentUserId);

    return {
        gameId: game.id,
        user: serializeGameHistoryUser(user),
        player: serializeGameHistoryPlayer(game, userId, user),
        opponent: serializeGameHistoryPlayer(game, opponentUserId, opponentUser),
        winnerId: game.winnerId,
        result: getGameResult(game, userId),
        ratingResult: getRatingResult(game),
        playerRating: (() => {
            const ratingResult = getRatingResult(game);
            if (!ratingResult) {
                return null;
            }

            return game.playerOneId === userId ? ratingResult.playerOne : ratingResult.playerTwo;
        })(),
        roundCount: game.data.currentRound,
        createdAt: game.createdAt.toISO()!,
        finishedAt: getGameFinishedAtIso(game),
        hasReplay: await gameHasReplayRecord(game.id),
    };
};
