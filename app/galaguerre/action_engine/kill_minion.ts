import type { GamePlayer, MinionSpotId } from "#api_types/game.types";
import type Game from "#models/game";
import { revertPassiveAurasForSource } from "../passive_engine/passive_aura.js";
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

    const card = minion.originalCard;
    revertPassiveAurasForSource(game, owner, minion);
    owner.board[spotId] = null;

    const { gameEnded } = executeDeathrattles(game, owner, card);

    return { gameEnded: gameEnded || isGameOver(game) };
};
