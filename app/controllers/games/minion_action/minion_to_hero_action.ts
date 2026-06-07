import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import { recordAttack } from "../../../galaguerre/game_log/record_game_log.js";
import {
    getActualDamage,
    recordDamageDealt,
} from "../../../galaguerre/game_stats/record_player_stats.js";
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
    if (owner !== "OPPONENT") {
        emitSocketEvent(
            "notify_error",
            {
                error: "J'aurai pu te laisser attaquer ton propre héros mais j'ai décidé d'être clément...",
            },
            socketId,
        );
        return;
    }

    const isValidTarget = ensureValidTauntTarget(opponent.board, null, owner, null, socketId);
    if (!isValidTarget) return;

    recordAttack(game, player, minionInfos.minion.originalCard, {
        type: "HERO",
        playerId: opponent.userId,
    });

    const playerTarget = owner === "OPPONENT" ? opponent : player;

    const damage = getActualDamage(playerTarget.health, minionInfos.minion.attack);
    recordDamageDealt(player, damage);
    playerTarget.health -= minionInfos.minion.attack;
    recordMinionAttack(minionInfos.minion, game.data.currentRound);

    if (player.health <= 0 || opponent.health <= 0) {
        await terminateGame(game);
        return;
    }

    await game.save();

    sendGameUpdate(game);
};
