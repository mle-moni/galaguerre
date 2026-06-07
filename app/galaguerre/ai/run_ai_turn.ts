import Game from "#models/game";
import { enumerateAiMoves } from "./enumerate_ai_moves.js";
import { tryAiAction, withAiSocket } from "./try_ai_action.js";

const MAX_ACTIONS_PER_TURN = 40;
let actionDelayMs = 800;

export const setAiActionDelayForTests = (ms: number): void => {
    actionDelayMs = ms;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const isAiTurn = (game: Game): boolean =>
    Boolean(game.data.isTraining && game.data.state === "PLAYER_TWO_TURN");

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

                    await sleep(actionDelayMs);
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
