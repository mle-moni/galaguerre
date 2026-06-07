import type { GamePlayer, MinionPosition, MinionSpotId, SpotOwner } from "#api_types/game.types";
import type Game from "#models/game";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import {
    getActualDamage,
    recordDamageDealt,
} from "../../../galaguerre/game_stats/record_player_stats.js";
import { killMinion } from "../../../galaguerre/action_engine/kill_minion.js";
import { ensureValidTauntTarget, getMinionIsPoisonous, recordMinionAttack } from "../game_utils.js";
import { sendGameUpdate } from "../send_game_update.js";
import { terminateGame } from "../terminate_game.js";

export interface MinionActionOptions {
    minionInfos: MinionPosition;
    game: Game;
    player: GamePlayer;
    opponent: GamePlayer;
    owner: SpotOwner;
    spotId: MinionSpotId;
    socketId: string;
}

export const minionToMinionAction = async ({
    minionInfos,
    opponent,
    spotId,
    owner,
    player,
    game,
    socketId,
}: MinionActionOptions) => {
    const targetBoard = owner === "PLAYER" ? player.board : opponent.board;
    const targetMinion = targetBoard[spotId];
    if (!targetMinion) {
        emitSocketEvent(
            "notify_error",
            { error: "Vous ne pouvez pas jouer ce serviteur ici" },
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

    const attacker = minionInfos.minion;
    const targetIsPoisonous = getMinionIsPoisonous(targetMinion);
    const attackerIsPoisonous = getMinionIsPoisonous(attacker);

    if (targetIsPoisonous) {
        recordDamageDealt(opponent, attacker.health);
        attacker.health = 0;
    } else {
        const retaliationDamage = getActualDamage(attacker.health, targetMinion.attack);
        attacker.health -= targetMinion.attack;
        recordDamageDealt(opponent, retaliationDamage);
    }
    if (attackerIsPoisonous) {
        recordDamageDealt(player, targetMinion.health);
        targetMinion.health = 0;
    } else {
        const attackDamage = getActualDamage(targetMinion.health, attacker.attack);
        targetMinion.health -= attacker.attack;
        recordDamageDealt(player, attackDamage);
    }
    recordMinionAttack(minionInfos.minion, game.data.currentRound);

    const initiatorOwner = minionInfos.position.owner === "PLAYER" ? player : opponent;
    const targetOwner = opponent;

    if (minionInfos.minion.health <= 0) {
        const { gameEnded } = killMinion(game, initiatorOwner, minionInfos.position.spotId);
        if (gameEnded) {
            await terminateGame(game);
            return;
        }
    }
    if (targetMinion.health <= 0) {
        const { gameEnded } = killMinion(game, targetOwner, spotId);
        if (gameEnded) {
            await terminateGame(game);
            return;
        }
    }

    await game.save();

    sendGameUpdate(game);
};
