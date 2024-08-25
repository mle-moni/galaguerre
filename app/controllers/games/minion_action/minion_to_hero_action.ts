import { sendGameUpdate } from "../send_game_update.js";
import { terminateGame } from "../terminate_game.js";
import type { MinionActionOptions } from "./minion_to_minion_action.js";

export const minionToHeroAction = async ({
    minionInfos,
    player,
    opponent,
    game,
    owner,
}: Omit<MinionActionOptions, "spotId">) => {
    const playerTarget = owner === "OPPONENT" ? opponent : player;

    // minionInfos.minion attacks playerTarget (usually the opponent)
    playerTarget.health -= minionInfos.minion.attack;
    minionInfos.minion.lastActionAtRound = game.data.currentRound;

    if (player.health <= 0 || opponent.health <= 0) {
        await terminateGame(game);
        return;
    }

    await game.save();

    sendGameUpdate(game);
};
