import type { GamePlayer, MinionCard } from "#api_types/game.types";
import type Game from "#models/game";
import { executeAction } from "./execute_action.js";
import { isV1Action } from "./is_v1_action.js";

const getOpponent = (game: Game, player: GamePlayer): GamePlayer => {
    return player === game.data.playerOne ? game.data.playerTwo : game.data.playerOne;
};

const isGameOver = (game: Game): boolean => {
    return game.data.playerOne.health <= 0 || game.data.playerTwo.health <= 0;
};

export const executeBattlecries = (
    game: Game,
    player: GamePlayer,
    card: MinionCard,
): { gameEnded: boolean } => {
    const opponent = getOpponent(game, player);

    for (const action of card.battlecryActions ?? []) {
        if (!isV1Action(action)) continue;

        executeAction(action, player, opponent);

        if (isGameOver(game)) {
            return { gameEnded: true };
        }
    }

    return { gameEnded: false };
};
