import type Game from "#models/game";
import { TRAINING_AI_USER_ID } from "#services/training/training_constants";

export const getTrainingGameHumanUserId = (game: Game): number | null => {
    if (!game.data.isTraining) return null;

    if (game.playerOneId && game.playerOneId !== TRAINING_AI_USER_ID) {
        return game.playerOneId;
    }

    if (game.playerTwoId && game.playerTwoId !== TRAINING_AI_USER_ID) {
        return game.playerTwoId;
    }

    const { playerOne, playerTwo } = game.data;

    if (playerOne.userId !== TRAINING_AI_USER_ID) return playerOne.userId;
    if (playerTwo.userId !== TRAINING_AI_USER_ID) return playerTwo.userId;

    return null;
};
