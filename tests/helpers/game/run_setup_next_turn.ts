import type { GameData } from "#api_types/game.types";
import type Game from "#models/game";
import { performPassTurn } from "#controllers/games/pass_game_turn";
import { setupNextGameTurn } from "#controllers/games/setup_next_game_turn";
import { createInMemoryGame } from "./in_memory_game.js";

const withTrainingGame = (data: GameData): Game =>
    createInMemoryGame({ ...data, isTraining: true });

export const runSetupNextTurn = async (data: GameData): Promise<{ game: Game }> => {
    const game = withTrainingGame(data);
    await setupNextGameTurn(game);
    return { game };
};

export const runPassTurnOnGame = async (data: GameData): Promise<{ game: Game }> => {
    const game = withTrainingGame(data);
    return runPassTurnFromGame(game);
};

export const runPassTurnFromGame = async (game: Game): Promise<{ game: Game }> => {
    const activePlayer =
        game.data.state === "PLAYER_ONE_TURN" ? game.data.playerOne : game.data.playerTwo;
    await performPassTurn(game, activePlayer);
    return { game };
};
