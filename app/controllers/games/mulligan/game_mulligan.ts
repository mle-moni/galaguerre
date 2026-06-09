import type Game from "#models/game";
import { scheduleAiMulliganIfNeeded } from "../../../galaguerre/ai/schedule_ai_mulligan.js";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import { getGameActionInfos, whichPlayerAmI } from "../game_utils.js";
import { sendGameUpdate } from "../send_game_update.js";
import { finalizeMulligan } from "./finalize_mulligan.js";
import {
    bothPlayersMulliganDone,
    markMulliganDone,
    performMulliganOnPlayer,
} from "./perform_mulligan.js";

interface MulliganPayload {
    cardIds: string[];
}

export const gameMulligan = async (socketId: string, { cardIds }: MulliganPayload) => {
    const gameInfos = await getGameActionInfos(socketId);
    if (!gameInfos) return;

    const { currentGame, userId } = gameInfos;

    if (currentGame.data.state !== "MULLIGAN") {
        emitSocketEvent("notify_error", { error: "Le mulligan n'est pas en cours" }, socketId);
        return;
    }

    const { player, playerType } = whichPlayerAmI(currentGame, userId);
    const mulligan = currentGame.data.mulligan;

    if (!mulligan) {
        emitSocketEvent("notify_error", { error: "Le mulligan n'est pas en cours" }, socketId);
        return;
    }

    const alreadyDone =
        playerType === "PLAYER_ONE" ? mulligan.playerOneDone : mulligan.playerTwoDone;

    if (alreadyDone) {
        emitSocketEvent(
            "notify_error",
            { error: "Vous avez déjà confirmé votre mulligan" },
            socketId,
        );
        return;
    }

    try {
        performMulliganOnPlayer(player, cardIds);
    } catch {
        emitSocketEvent(
            "notify_error",
            { error: "Sélection de cartes invalide pour le mulligan" },
            socketId,
        );
        return;
    }

    markMulliganDone(currentGame, playerType);

    if (bothPlayersMulliganDone(currentGame)) {
        await finalizeMulligan(currentGame);
        return;
    }

    await currentGame.save();
    sendGameUpdate(currentGame);
    scheduleAiMulliganIfNeeded(currentGame);
};

export const confirmMulliganForPlayer = async (
    game: Game,
    playerType: "PLAYER_ONE" | "PLAYER_TWO",
    cardIds: string[] = [],
): Promise<void> => {
    if (game.data.state !== "MULLIGAN" || !game.data.mulligan) return;

    const player = playerType === "PLAYER_ONE" ? game.data.playerOne : game.data.playerTwo;

    const alreadyDone =
        playerType === "PLAYER_ONE"
            ? game.data.mulligan.playerOneDone
            : game.data.mulligan.playerTwoDone;

    if (alreadyDone) return;

    performMulliganOnPlayer(player, cardIds);
    markMulliganDone(game, playerType);

    if (bothPlayersMulliganDone(game)) {
        await finalizeMulligan(game);
        return;
    }

    await game.save();
    sendGameUpdate(game);
};
