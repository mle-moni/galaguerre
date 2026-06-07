import type { GamePlayer, MinionCard } from "#api_types/game.types";
import type Game from "#models/game";
import { recordDeathrattle } from "../game_log/record_game_log.js";
import { executeDeathrattleAction } from "./execute_deathrattle_action.js";

const getOpponent = (game: Game, player: GamePlayer): GamePlayer => {
    return player === game.data.playerOne ? game.data.playerTwo : game.data.playerOne;
};

const isGameOver = (game: Game): boolean => {
    return game.data.playerOne.health <= 0 || game.data.playerTwo.health <= 0;
};

export const executeDeathrattles = (
    game: Game,
    player: GamePlayer,
    card: MinionCard,
): { gameEnded: boolean } => {
    const opponent = getOpponent(game, player);

    if ((card.deathrattleActions ?? []).length > 0) {
        recordDeathrattle(game, player, card);
    }

    for (const action of card.deathrattleActions ?? []) {
        const result = executeDeathrattleAction(game, player, opponent, action);
        if (result.gameEnded || isGameOver(game)) {
            return { gameEnded: true };
        }
    }

    return { gameEnded: false };
};
