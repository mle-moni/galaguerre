import type { GamePlayer, MinionSpotId } from "#api_types/game.types";
import type Game from "#models/game";
import { executeDeathrattles } from "./execute_deathrattles.js";

const isGameOver = (game: Game): boolean => {
    return game.data.playerOne.health <= 0 || game.data.playerTwo.health <= 0;
};

export const killMinion = (
    game: Game,
    owner: GamePlayer,
    spotId: MinionSpotId,
): { gameEnded: boolean } => {
    const minion = owner.board[spotId];
    if (!minion) return { gameEnded: false };

    if (minion.originalCard.type !== "MINION") {
        owner.board[spotId] = null;
        return { gameEnded: false };
    }

    const { gameEnded } = executeDeathrattles(game, owner, minion.originalCard);
    owner.board[spotId] = null;

    return { gameEnded: gameEnded || isGameOver(game) };
};
