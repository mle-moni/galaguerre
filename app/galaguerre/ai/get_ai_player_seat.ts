import type Game from "#models/game";
import { TRAINING_AI_USER_ID } from "#services/training/training_constants";
import type { PlayerNumber } from "#api_types/game.types";

export const getAiPlayerSeat = (game: Game): PlayerNumber | null => {
    if (!game.data.isTraining) return null;

    if (game.data.playerOne.userId === TRAINING_AI_USER_ID) {
        return "PLAYER_ONE";
    }

    if (game.data.playerTwo.userId === TRAINING_AI_USER_ID) {
        return "PLAYER_TWO";
    }

    return null;
};

export const isAiTurn = (game: Game): boolean => {
    const aiSeat = getAiPlayerSeat(game);
    if (!aiSeat) return false;

    if (aiSeat === "PLAYER_ONE" && game.data.state === "PLAYER_ONE_TURN") {
        return true;
    }

    if (aiSeat === "PLAYER_TWO" && game.data.state === "PLAYER_TWO_TURN") {
        return true;
    }

    return false;
};

export const isAiMulliganPending = (game: Game): boolean => {
    if (game.data.state !== "MULLIGAN" || !game.data.mulligan) return false;

    const aiSeat = getAiPlayerSeat(game);
    if (!aiSeat) return false;

    if (aiSeat === "PLAYER_ONE") {
        return !game.data.mulligan.playerOneDone;
    }

    return !game.data.mulligan.playerTwoDone;
};
