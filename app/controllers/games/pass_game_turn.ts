import { recordPassTurn } from "../../galaguerre/game_log/record_game_log.js";
import { triggerPassives } from "../../galaguerre/passive_engine/trigger_passives.js";
import type { GamePlayer } from "#api_types/game.types";
import type Game from "#models/game";
import {
    beginLoggedBeat,
    endCurrentBeat,
} from "../../galaguerre/game_narrative/narrative_beats.js";
import { runGameActionWithNarrative } from "../../galaguerre/game_narrative/run_game_action_with_narrative.js";
import { ensureIsMyTurn, getGameActionInfos } from "./game_utils.js";
import { ensureNoPendingDiscover } from "./discover/ensure_no_pending_discover.js";
import { setupNextGameTurn } from "./setup_next_game_turn.js";
import { terminateGame } from "./terminate_game.js";

export const performPassTurn = async (game: Game, activePlayer: GamePlayer): Promise<void> => {
    await runGameActionWithNarrative(game, async () => {
        recordPassTurn(game, activePlayer);
        beginLoggedBeat(game, "PASS_TURN");
        const { gameEnded: turnEndGameEnded } = triggerPassives(game, "TURN_END", activePlayer);
        endCurrentBeat(game);

        if (turnEndGameEnded) {
            await terminateGame(game, { skipSendUpdate: true });
        }
    });

    if (game.isFinished) return;

    await setupNextGameTurn(game);
};

export const passGameTurn = async (socketId: string) => {
    const gameInfos = await getGameActionInfos(socketId);
    if (!gameInfos) return;

    const { currentGame, userId } = gameInfos;
    const isMyTurn = ensureIsMyTurn(currentGame, userId, socketId);
    if (!isMyTurn) return;
    if (!ensureNoPendingDiscover(currentGame, socketId, userId)) return;

    const activePlayer =
        currentGame.data.state === "PLAYER_ONE_TURN"
            ? currentGame.data.playerOne
            : currentGame.data.playerTwo;

    await performPassTurn(currentGame, activePlayer);
};
