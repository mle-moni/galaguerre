import type { GamePlayer, MinionPosition, MinionSpotId, SpotOwner } from "#api_types/game.types";
import type Game from "#models/game";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import { recordAttack } from "../../../galaguerre/game_log/record_game_log.js";
import {
    applyDamageToMinion,
    applyPoisonousToMinion,
} from "../../../galaguerre/action_engine/apply_damage_to_minion.js";
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

    recordAttack(game, player, attacker.originalCard, {
        type: "MINION",
        card: targetMinion.originalCard,
    });

    const targetIsPoisonous = getMinionIsPoisonous(targetMinion);
    const attackerIsPoisonous = getMinionIsPoisonous(attacker);

    const initiatorOwner = minionInfos.position.owner === "PLAYER" ? player : opponent;
    const targetOwner = opponent;
    const attackerSpotId = minionInfos.position.spotId;

    if (targetIsPoisonous) {
        const retaliationResult = applyPoisonousToMinion(
            game,
            initiatorOwner,
            attackerSpotId,
            attacker,
            opponent,
        );
        if (retaliationResult.gameEnded) {
            await terminateGame(game);
            return;
        }
    } else {
        const retaliationResult = applyDamageToMinion(
            game,
            initiatorOwner,
            attackerSpotId,
            attacker,
            targetMinion.attack,
            opponent,
        );
        if (retaliationResult.gameEnded) {
            await terminateGame(game);
            return;
        }
    }

    if (attackerIsPoisonous) {
        const attackResult = applyPoisonousToMinion(
            game,
            targetOwner,
            spotId,
            targetMinion,
            player,
        );
        if (attackResult.gameEnded) {
            await terminateGame(game);
            return;
        }
    } else {
        const attackResult = applyDamageToMinion(
            game,
            targetOwner,
            spotId,
            targetMinion,
            attacker.attack,
            player,
        );
        if (attackResult.gameEnded) {
            await terminateGame(game);
            return;
        }
    }

    recordMinionAttack(minionInfos.minion, game.data.currentRound);

    await game.save();

    sendGameUpdate(game);
};
