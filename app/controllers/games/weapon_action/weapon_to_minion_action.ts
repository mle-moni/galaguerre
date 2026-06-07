import type { GamePlayer, MinionSpotId, SpotOwner, WeaponState } from "#api_types/game.types";
import type Game from "#models/game";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import { getActualDamage, recordDamageDealt } from "../../../galaguerre/game_stats/record_player_stats.js";
import { killMinion } from "../../../galaguerre/action_engine/kill_minion.js";
import { ensureValidTauntTarget, recordHeroAttack } from "../game_utils.js";
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

    const isValidTarget = ensureValidTauntTarget(
        opponent.board,
        spotId,
        owner,
        targetMinion,
        socketId,
    );
    if (!isValidTarget) return;

    const weaponDamage = getActualDamage(targetMinion.health, weaponState.damage);
    targetMinion.health -= weaponState.damage;
    recordDamageDealt(player, weaponDamage);

    const retaliationDamage = getActualDamage(player.health, targetMinion.attack);
    player.health -= targetMinion.attack;
    recordDamageDealt(opponent, retaliationDamage);

    recordHeroAttack(player, game.data.currentRound);

    if (targetMinion.health <= 0) {
        const { gameEnded } = killMinion(game, opponent, spotId);
        if (gameEnded) {
            await terminateGame(game);
            return;
        }
    }

    const { gameEnded: durabilityGameEnded } = reduceWeaponDurability(game, player);
    if (durabilityGameEnded || player.health <= 0 || opponent.health <= 0) {
        await terminateGame(game);
        return;
    }

    await game.save();

    sendGameUpdate(game);
};
