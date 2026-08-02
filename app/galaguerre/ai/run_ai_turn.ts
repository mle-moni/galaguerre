import Game from "#models/game";
import { getAiActionDelayMs } from "./ai_action_delay.js";
import { enumerateAiMoves } from "./enumerate_ai_moves.js";
import { isAiTurn } from "./get_ai_player_seat.js";
import { tryAiAction, withAiSocket } from "./try_ai_action.js";

export { setAiActionDelayForTests } from "./ai_action_delay.js";

const MAX_ACTIONS_PER_TURN = 40;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const runAiTurn = async (gameId: number, aiUserId: number): Promise<void> => {
    await withAiSocket(gameId, aiUserId, async (socketId) => {
        let actionsThisTurn = 0;

        while (actionsThisTurn < MAX_ACTIONS_PER_TURN) {
            const game = await Game.findOrFail(gameId);
            await game.refresh();

            if (game.isFinished || !isAiTurn(game)) break;

            const moves = enumerateAiMoves(game, aiUserId);
            let actionSucceeded = false;

            for (const move of moves) {
                const success = await tryAiAction(game, socketId, move);
                await game.refresh();

                if (success) {
                    actionSucceeded = true;
                    actionsThisTurn++;

                    if (move.type === "pass_turn" || game.isFinished) {
                        return;
                    }

                    await sleep(getAiActionDelayMs());
                    break;
                }
            }

            if (!actionSucceeded) {
                await tryAiAction(game, socketId, { type: "pass_turn" });
                return;
            }
        }

        const game = await Game.findOrFail(gameId);
        await game.refresh();

        if (!game.isFinished && isAiTurn(game)) {
            await tryAiAction(game, socketId, { type: "pass_turn" });
        }
    });
};
