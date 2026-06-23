import type { ApiGameReplay } from "#api_types/game_replay.types";
import { loadGameReplayData } from "#galaguerre/game_replay/game_replay_buffer";
import Game from "#models/game";
import User from "#models/user";
import type { HttpContext } from "@adonisjs/core/http";
import vine from "@vinejs/vine";
import { isGameParticipant } from "./serialize_game_history.js";

const showParamsValidator = vine.compile(
    vine.object({
        userId: vine.number(),
        gameId: vine.number(),
    }),
);

export const showGameReplay = async ({ params, response }: HttpContext): Promise<ApiGameReplay> => {
    const { userId, gameId } = await showParamsValidator.validate(params);
    const user = await User.find(userId);

    if (!user) {
        return response.notFound({ error: "Utilisateur introuvable" }) as never;
    }

    const game = await Game.find(gameId);

    if (!game || !game.isFinished || !isGameParticipant(game, userId)) {
        return response.notFound({ error: "Partie introuvable" }) as never;
    }

    const replay = await loadGameReplayData(game.id);
    if (!replay) {
        return response.notFound({ error: "Replay indisponible pour cette partie" }) as never;
    }

    const playerOneUser = game.playerOneId ? await User.find(game.playerOneId) : null;
    const playerTwoUser = game.playerTwoId ? await User.find(game.playerTwoId) : null;

    return {
        gameId: game.id,
        playerOne: {
            userId: game.data.playerOne.userId,
            pseudo: playerOneUser?.pseudo ?? game.data.playerOne.pseudo,
        },
        playerTwo: {
            userId: game.data.playerTwo.userId,
            pseudo: playerTwoUser?.pseudo ?? game.data.playerTwo.pseudo,
        },
        winnerId: game.winnerId,
        replay,
    };
};
