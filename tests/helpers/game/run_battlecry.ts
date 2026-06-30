import type { ActionTarget, GameData, MinionCard } from "#api_types/game.types";
import type Game from "#models/game";
import { executeBattlecries } from "#galaguerre/action_engine/execute_battlecries";
import { createMinionState } from "./fixtures.js";
import { createInMemoryGame } from "./in_memory_game.js";
import { refreshAurasAfterMinionPlayed } from "#galaguerre/passive_engine/refresh_passive_auras";

export type PlayerKey = "playerOne" | "playerTwo";

export interface BattlecryRunOptions {
    boardIndex?: number;
    actionTarget?: ActionTarget;
    actor?: PlayerKey;
}

export const runBattlecry = (
    data: GameData,
    card: MinionCard,
    options: BattlecryRunOptions = {},
): { game: Game; gameEnded: boolean; discoverPending: boolean } => {
    const boardIndex = options.boardIndex ?? 0;
    const actor = options.actor ?? "playerOne";
    const game = createInMemoryGame(data);
    const player = game.data[actor];

    player.hand = player.hand.filter((handCard) => handCard.uuid !== card.uuid);
    player.board.splice(
        boardIndex,
        0,
        createMinionState(card, { placedAtRound: game.data.currentRound }),
    );
    refreshAurasAfterMinionPlayed(game, player, boardIndex);

    const { gameEnded, discoverPending } = executeBattlecries(
        game,
        player,
        card,
        options.actionTarget,
    );

    if (gameEnded) {
        game.isFinished = true;
        game.data.state = "FINISHED";
    }

    return { game, gameEnded, discoverPending };
};
