import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import { resolveDiscoverChoice } from "../../../galaguerre/discover/resolve_discover_choice.js";
import { runGameActionWithNarrative } from "../../../galaguerre/game_narrative/run_game_action_with_narrative.js";
import { scheduleAiDiscoverIfNeeded } from "../../../galaguerre/ai/schedule_ai_discover.js";
import { terminateGame } from "../terminate_game.js";
import { getGameActionInfos, whichPlayerAmI } from "../game_utils.js";

export const gameDiscoverChoice = async (socketId: string, { cardUuid }: { cardUuid: string }) => {
    const gameInfos = await getGameActionInfos(socketId);
    if (!gameInfos) return;

    const { currentGame, userId } = gameInfos;
    const pending = currentGame.data.pendingDiscover;

    if (!pending) {
        emitSocketEvent("notify_error", { error: "Aucune découverte en cours" }, socketId);
        return;
    }

    if (pending.playerUserId !== userId) {
        emitSocketEvent("notify_error", { error: "Ce n'est pas à vous de choisir" }, socketId);
        return;
    }

    const { player } = whichPlayerAmI(currentGame, userId);

    await runGameActionWithNarrative(currentGame, async () => {
        const { gameEnded, discoverPending } = resolveDiscoverChoice(currentGame, player, cardUuid);

        if (gameEnded) {
            await terminateGame(currentGame, { skipSendUpdate: true });
            return;
        }

        if (discoverPending) return;
    });

    scheduleAiDiscoverIfNeeded(currentGame);
};
