import type Game from "#models/game";
import { COIN_CARD_ID } from "#api_types/game.types";
import { instantiateDeckCard } from "../../../galaguerre/deck_card_operations.js";
import { clearMulliganTimer } from "../../../galaguerre/timers/game_timers.js";
import { setupNextGameTurn } from "../setup_next_game_turn.js";

export const finalizeMulligan = async (game: Game): Promise<void> => {
    if (game.data.state !== "MULLIGAN") return;

    clearMulliganTimer(game.id);
    delete game.data.mulliganEndsAt;
    delete game.data.mulligan;

    const coin = instantiateDeckCard(COIN_CARD_ID);
    if (coin) {
        game.data.playerTwo.hand.push(coin);
    }

    await setupNextGameTurn(game);
};
