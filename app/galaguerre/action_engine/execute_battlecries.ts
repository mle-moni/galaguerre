import type { ActionTarget, GamePlayer, MinionCard } from "#api_types/game.types";
import type Game from "#models/game";
import { recordBattlecry } from "../game_log/record_game_log.js";
import { executeAction } from "./execute_action.js";
import { findMinionOnPlayerBoard } from "./find_minion_on_board.js";
import { isTargetedV1Action } from "./is_targeted_v1_action.js";
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
    selectedTarget?: ActionTarget,
): { gameEnded: boolean } => {
    const opponent = getOpponent(game, player);
    const sourceMinion = findMinionOnPlayerBoard(player, card.uuid);

    const hasValidBattlecry = (card.battlecryActions ?? []).some(
        (action) => isV1Action(action) || isTargetedV1Action(action),
    );
    if (hasValidBattlecry) {
        recordBattlecry(game, player, card);
    }

    for (const action of card.battlecryActions ?? []) {
        if (!isV1Action(action) && !isTargetedV1Action(action)) continue;

        executeAction(action, game, player, opponent, selectedTarget, 0, sourceMinion);

        if (isGameOver(game)) {
            return { gameEnded: true };
        }
    }

    return { gameEnded: false };
};
