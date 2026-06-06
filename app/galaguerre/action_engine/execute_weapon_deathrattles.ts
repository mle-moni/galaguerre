import type { GamePlayer, WeaponCard } from "#api_types/game.types";
import type Game from "#models/game";
import { executeDeathrattleAction } from "./execute_deathrattle_action.js";

const getOpponent = (game: Game, player: GamePlayer): GamePlayer => {
    return player === game.data.playerOne ? game.data.playerTwo : game.data.playerOne;
};

const isGameOver = (game: Game): boolean => {
    return game.data.playerOne.health <= 0 || game.data.playerTwo.health <= 0;
};

export const executeWeaponDeathrattles = (
    game: Game,
    player: GamePlayer,
    card: WeaponCard,
): { gameEnded: boolean } => {
    const opponent = getOpponent(game, player);

    for (const action of card.deathrattleActions ?? []) {
        const result = executeDeathrattleAction(game, player, opponent, action);
        if (result.gameEnded || isGameOver(game)) {
            return { gameEnded: true };
        }
    }

    return { gameEnded: false };
};
