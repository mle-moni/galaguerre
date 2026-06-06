import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import { ensureValidTauntTarget, recordHeroAttack } from "../game_utils.js";
import { sendGameUpdate } from "../send_game_update.js";
import { terminateGame } from "../terminate_game.js";
import type { WeaponActionOptions } from "./weapon_to_minion_action.js";
import { reduceWeaponDurability } from "./reduce_weapon_durability.js";

export const weaponToHeroAction = async ({
    weaponState,
    player,
    opponent,
    game,
    owner,
    socketId,
}: Omit<WeaponActionOptions, "spotId">) => {
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

    opponent.health -= weaponState.damage;
    recordHeroAttack(player, game.data.currentRound);

    const { gameEnded: durabilityGameEnded } = reduceWeaponDurability(game, player);
    if (durabilityGameEnded || player.health <= 0 || opponent.health <= 0) {
        await terminateGame(game);
        return;
    }

    await game.save();

    sendGameUpdate(game);
};
