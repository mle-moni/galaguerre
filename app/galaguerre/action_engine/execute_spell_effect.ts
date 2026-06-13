import type { ActionTarget, GamePlayer, SpellCard } from "#api_types/game.types";
import type Game from "#models/game";
import { executeAction } from "./execute_action.js";
import { isTargetedV1Action } from "./is_targeted_v1_action.js";
import { isV1Action } from "./is_v1_action.js";

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

    for (const action of card.spellActions) {
        if (!isV1Action(action) && !isTargetedV1Action(action)) continue;

        executeAction(action, game, player, opponent, selectedTarget, player.spellPower);

        if (isGameOver(game)) {
            return { gameEnded: true };
        }
    }

    return { gameEnded: false };
};
