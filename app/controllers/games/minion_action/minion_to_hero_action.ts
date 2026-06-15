import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import { recordAttack } from "../../../galaguerre/game_log/record_game_log.js";
import { applyDamageToHero } from "../../../galaguerre/action_engine/apply_damage_to_hero.js";
import { ensureValidAttackTarget, recordMinionAttack } from "../game_utils.js";
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

    const isValidTarget = ensureValidAttackTarget(opponent.board, null, owner, null, socketId);
    if (!isValidTarget) return;

    recordAttack(game, player, minionInfos.minion.originalCard, {
        type: "HERO",
        playerId: opponent.userId,
    });

    const playerTarget = owner === "OPPONENT" ? opponent : player;

    const { gameEnded: damageGameEnded } = applyDamageToHero(
        game,
        playerTarget,
        minionInfos.minion.attack,
        player,
    );
    recordMinionAttack(minionInfos.minion, game.data.currentRound);

    if (damageGameEnded || player.health <= 0 || opponent.health <= 0) {
        await terminateGame(game);
        return;
    }

    await game.save();

    sendGameUpdate(game);
};
