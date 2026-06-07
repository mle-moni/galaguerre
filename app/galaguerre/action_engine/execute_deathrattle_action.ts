import type { CardActionSnapshot, GamePlayer } from "#api_types/game.types";
import type Game from "#models/game";
import { applyDamageToAllMinions, applyHealToAllMinions } from "./apply_mass_minion_effects.js";
import { executeAction } from "./execute_action.js";
import { isDeathrattleV1Action } from "./is_deathrattle_v1_action.js";

const isGameOver = (game: Game): boolean => {
    return game.data.playerOne.health <= 0 || game.data.playerTwo.health <= 0;
};

export const executeDeathrattleAction = (
    game: Game,
    player: GamePlayer,
    opponent: GamePlayer,
    action: CardActionSnapshot,
): { gameEnded: boolean } => {
    if (!isDeathrattleV1Action(action)) {
        return { gameEnded: false };
    }

    if (action.type === "DAMAGE" && action.target?.type === "MINION") {
        return applyDamageToAllMinions(
            game,
            player,
            opponent,
            action.target,
            action.damage!,
            player,
        );
    }

    if (action.type === "HEAL" && action.target?.type === "MINION") {
        return applyHealToAllMinions(
            game,
            player,
            opponent,
            action.target,
            action.heal!,
            player,
        );
    }

    executeAction(action, game, player, opponent);
    return { gameEnded: isGameOver(game) };
};
