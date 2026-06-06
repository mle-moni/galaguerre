import { ensureValidTauntTarget, recordMinionAttack } from "../game_utils.js";
import { sendGameUpdate } from "../send_game_update.js";
import { terminateGame } from "../terminate_game.js";
import type { MinionActionOptions } from "./minion_to_minion_action.js";

export const minionToHeroAction = async ({
    minionInfos,
    player,
    opponent,
    game,
    owner,
    socketId,
}: Omit<MinionActionOptions, "spotId">) => {
    const isValidTarget = ensureValidTauntTarget(opponent.board, null, owner, null, socketId);
    if (!isValidTarget) return;

    const playerTarget = owner === "OPPONENT" ? opponent : player;

    // minionInfos.minion attacks playerTarget (usually the opponent)
    playerTarget.health -= minionInfos.minion.attack;
    recordMinionAttack(minionInfos.minion, game.data.currentRound);

    if (player.health <= 0 || opponent.health <= 0) {
        await terminateGame(game);
        return;
    }

    await game.save();

    sendGameUpdate(game);
};
