import type { ActionTarget, GameData, MinionCard } from "#api_types/game.types";
import type Game from "#models/game";
import { executeCombo } from "#galaguerre/action_engine/execute_combo";
import { createMinionState } from "./fixtures.js";
import { createInMemoryGame } from "./in_memory_game.js";
import { refreshAurasAfterMinionPlayed } from "#galaguerre/passive_engine/refresh_passive_auras";

export type PlayerKey = "playerOne" | "playerTwo";

export interface ComboRunOptions {
    boardIndex?: number;
    actionTarget?: ActionTarget;
    actor?: PlayerKey;
    cardsPlayedThisTurn?: number;
}

export const runCombo = (
    data: GameData,
    card: MinionCard,
    options: ComboRunOptions = {},
): { game: Game; gameEnded: boolean; discoverPending: boolean } => {
    const boardIndex = options.boardIndex ?? 0;
    const actor = options.actor ?? "playerOne";
    const game = createInMemoryGame(data);
    const player = game.data[actor];

    if (options.cardsPlayedThisTurn !== undefined) {
        player.cardsPlayedThisTurn = options.cardsPlayedThisTurn;
    }

    player.hand = player.hand.filter((handCard) => handCard.uuid !== card.uuid);
    player.board.splice(
        boardIndex,
        0,
        createMinionState(card, { placedAtRound: game.data.currentRound }),
    );
    refreshAurasAfterMinionPlayed(game, player, boardIndex);

    const { gameEnded, discoverPending } = executeCombo(game, player, card, options.actionTarget);

    if (gameEnded) {
        game.isFinished = true;
        game.data.state = "FINISHED";
    }

    return { game, gameEnded, discoverPending };
};
