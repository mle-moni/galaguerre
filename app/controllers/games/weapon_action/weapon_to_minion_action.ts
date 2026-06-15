import type { GamePlayer, MinionSpotId, SpotOwner, WeaponState } from "#api_types/game.types";
import type Game from "#models/game";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import { recordAttack } from "../../../galaguerre/game_log/record_game_log.js";
import { applyDamageToHero } from "../../../galaguerre/action_engine/apply_damage_to_hero.js";
import { applyDamageToMinion } from "../../../galaguerre/action_engine/apply_damage_to_minion.js";
import { ensureValidAttackTarget, recordHeroAttack } from "../game_utils.js";
import { sendGameUpdate } from "../send_game_update.js";
import { terminateGame } from "../terminate_game.js";
import { reduceWeaponDurability } from "./reduce_weapon_durability.js";

export interface WeaponActionOptions {
    weaponState: WeaponState;
    game: Game;
    player: GamePlayer;
    opponent: GamePlayer;
    owner: SpotOwner;
    spotId: MinionSpotId;
    socketId: string;
}

export const weaponToMinionAction = async ({
    weaponState,
    opponent,
    spotId,
    owner,
    player,
    game,
    socketId,
}: WeaponActionOptions) => {
    const targetBoard = owner === "PLAYER" ? player.board : opponent.board;
    const targetMinion = targetBoard[spotId];
    if (!targetMinion) {
        emitSocketEvent(
            "notify_error",
            { error: "Vous ne pouvez pas attaquer ce serviteur ici" },
            socketId,
        );
        return;
    }

    if (owner === "PLAYER") {
        emitSocketEvent(
            "notify_error",
            {
                error: "J'aurai pu te laisser attaquer ton propre serviteur mais j'ai décidé d'être clément...",
            },
            socketId,
        );
        return;
    }

    const isValidTarget = ensureValidAttackTarget(
        opponent.board,
        spotId,
        owner,
        targetMinion,
        socketId,
    );
    if (!isValidTarget) return;

    recordAttack(game, player, weaponState.originalCard, {
        type: "MINION",
        card: targetMinion.originalCard,
    });

    const weaponDamageResult = applyDamageToMinion(
        game,
        opponent,
        spotId,
        targetMinion,
        weaponState.damage,
        player,
    );
    if (weaponDamageResult.gameEnded) {
        await terminateGame(game);
        return;
    }

    const { gameEnded: retaliationGameEnded } = applyDamageToHero(
        game,
        player,
        targetMinion.attack,
        opponent,
    );

    recordHeroAttack(player, game.data.currentRound);

    const { gameEnded: durabilityGameEnded } = reduceWeaponDurability(game, player);
    if (durabilityGameEnded || retaliationGameEnded || player.health <= 0 || opponent.health <= 0) {
        await terminateGame(game);
        return;
    }

    await game.save();

    sendGameUpdate(game);
};
