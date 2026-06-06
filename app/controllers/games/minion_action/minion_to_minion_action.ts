import type { GamePlayer, MinionPosition, MinionSpotId, SpotOwner } from "#api_types/game.types";
import type Game from "#models/game";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
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
    const initiatorBoard = minionInfos.position.owner === "PLAYER" ? player.board : opponent.board;
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

    // minionInfos.minion attacks targetMinion
    if (getMinionIsPoisonous(targetMinion)) {
        minionInfos.minion.health = 0;
    } else {
        minionInfos.minion.health -= targetMinion.attack;
    }
    if (getMinionIsPoisonous(minionInfos.minion)) {
        targetMinion.health = 0;
    } else {
        targetMinion.health -= minionInfos.minion.attack;
    }
    recordMinionAttack(minionInfos.minion, game.data.currentRound);

    const initiatorOwner = minionInfos.position.owner === "PLAYER" ? player : opponent;
    const targetOwner = owner === "PLAYER" ? player : opponent;

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
