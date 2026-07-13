import type { GamePlayer, MinionCard, MinionState } from "#api_types/game.types";
import type Game from "#models/game";
import { executeAttackActions } from "../../../galaguerre/action_engine/execute_attack_actions.js";
import { recordMinionAttack } from "../game_utils.js";
import { terminateGame } from "../terminate_game.js";

export const completeMinionAttack = async (
    game: Game,
    player: GamePlayer,
    attacker: MinionState,
): Promise<{ gameEnded: boolean }> => {
    recordMinionAttack(attacker, game.data.currentRound);

    const card = attacker.originalCard;
    if (card.type !== "MINION") {
        return { gameEnded: false };
    }

    const result = executeAttackActions(game, player, card as MinionCard);
    if (result.gameEnded) {
        await terminateGame(game, { skipSendUpdate: true });
        return { gameEnded: true };
    }

    return { gameEnded: false };
};
