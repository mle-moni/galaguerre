import type { ActionTarget, GamePlayer, SpellCard } from "#api_types/game.types";
import type Game from "#models/game";
import { executeAction } from "./execute_action.js";

const getOpponent = (game: Game, player: GamePlayer): GamePlayer => {
    return player === game.data.playerOne ? game.data.playerTwo : game.data.playerOne;
};

const isGameOver = (game: Game): boolean => {
    return game.data.playerOne.health <= 0 || game.data.playerTwo.health <= 0;
};

export const executeSpellEffect = (
    game: Game,
    player: GamePlayer,
    card: SpellCard,
    selectedTarget?: ActionTarget,
): { gameEnded: boolean } => {
    const opponent = getOpponent(game, player);

    executeAction(card.action, game, player, opponent, selectedTarget, player.spellPower);

    return { gameEnded: isGameOver(game) };
};
