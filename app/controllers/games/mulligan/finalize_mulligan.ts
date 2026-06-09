import type Game from "#models/game";
import { createCoinCard } from "../../../galaguerre/coin.js";
import { clearMulliganTimer } from "../../../galaguerre/timers/game_timers.js";
import { setupNextGameTurn } from "../setup_next_game_turn.js";

export const finalizeMulligan = async (game: Game): Promise<void> => {
    if (game.data.state !== "MULLIGAN") return;

    clearMulliganTimer(game.id);
    delete game.data.mulliganEndsAt;
    delete game.data.mulligan;

    game.data.playerTwo.hand.push(createCoinCard());

    await setupNextGameTurn(game);
};
