import Game from "#models/game";
import { TRAINING_AI_USER_ID } from "#services/training/training_constants";
import { getAiPlayerSeat, isAiMulliganPending } from "./get_ai_player_seat.js";
import { withAiSocket } from "./try_ai_action.js";
import { confirmMulliganForPlayer } from "#controllers/games/mulligan/game_mulligan";

const runningAiMulligans = new Set<number>();

export const scheduleAiMulliganIfNeeded = (game: Game): void => {
    if (!isAiMulliganPending(game)) return;

    const gameId = game.id;
    if (runningAiMulligans.has(gameId)) return;

    const aiSeat = getAiPlayerSeat(game);
    if (!aiSeat) return;

    runningAiMulligans.add(gameId);

    runAiMulligan(gameId, aiSeat)
        .catch((error) => {
            console.error(`AI mulligan failed for game ${gameId}:`, error);
        })
        .finally(() => {
            runningAiMulligans.delete(gameId);
        });
};

const runAiMulligan = async (
    gameId: number,
    aiSeat: "PLAYER_ONE" | "PLAYER_TWO",
): Promise<void> => {
    await withAiSocket(gameId, TRAINING_AI_USER_ID, async () => {
        const game = await Game.findOrFail(gameId);
        await game.refresh();

        if (!isAiMulliganPending(game)) return;

        await confirmMulliganForPlayer(game, aiSeat, []);
    });
};
