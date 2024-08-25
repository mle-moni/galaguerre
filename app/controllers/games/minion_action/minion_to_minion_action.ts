import type { GamePlayer, MinionPosition, MinionSpotId, SpotOwner } from "#api_types/game.types";
import type Game from "#models/game";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import { sendGameUpdate } from "../send_game_update.js";

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

    // minionInfos.minion attacks targetMinion
    minionInfos.minion.health -= targetMinion.attack;
    targetMinion.health -= minionInfos.minion.attack;
    minionInfos.minion.lastActionAtRound = game.data.currentRound;

    if (minionInfos.minion.health <= 0) {
        initiatorBoard[minionInfos.position.spotId] = null;
    }
    if (targetMinion.health <= 0) {
        targetBoard[spotId] = null;
    }

    await game.save();

    sendGameUpdate(game);
};
