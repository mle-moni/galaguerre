import Game from "#models/game";
import { TRAINING_AI_USER_ID } from "#services/training/training_constants";
import { isSimulating } from "../../utils/simulation_context.js";
import { runAdvancedAiTurn } from "./advanced/run_advanced_ai_turn.js";
import { isAdvancedAi } from "./get_ai_difficulty.js";
import { isAiTurn } from "./get_ai_player_seat.js";
import { runAiTurn } from "./run_ai_turn.js";

const runningAiTurns = new Set<number>();

export const scheduleAiTurnIfNeeded = (game: Game): void => {
    if (isSimulating()) return;
    if (!game.data.isTraining || !isAiTurn(game)) return;

    const gameId = game.id;
    if (runningAiTurns.has(gameId)) return;

    const aiUserId = TRAINING_AI_USER_ID;
    const runTurn = isAdvancedAi(game) ? runAdvancedAiTurn : runAiTurn;
    runningAiTurns.add(gameId);

    runTurn(gameId, aiUserId)
        .catch((error) => {
            console.error(`AI turn failed for game ${gameId}:`, error);
        })
        .finally(() => {
            runningAiTurns.delete(gameId);
        });
};
