import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import { recordAttack } from "../../../galaguerre/game_log/record_game_log.js";
import { applyDamageToHero } from "../../../galaguerre/action_engine/apply_damage_to_hero.js";
import { ensureValidAttackTarget, recordHeroAttack } from "../game_utils.js";
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
}: Omit<WeaponActionOptions, "targetMinion">) => {
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

    const isValidTarget = ensureValidAttackTarget(opponent.board, owner, null, socketId);
    if (!isValidTarget) return;

    recordAttack(game, player, weaponState.originalCard, {
        type: "HERO",
        playerId: opponent.userId,
    });

    const { gameEnded: damageGameEnded } = applyDamageToHero(
        game,
        opponent,
        weaponState.damage,
        player,
    );
    recordHeroAttack(player, game.data.currentRound);

    const { gameEnded: durabilityGameEnded } = reduceWeaponDurability(game, player);
    if (durabilityGameEnded || damageGameEnded || player.health <= 0 || opponent.health <= 0) {
        await terminateGame(game);
        return;
    }

    await game.save();

    sendGameUpdate(game);
};
