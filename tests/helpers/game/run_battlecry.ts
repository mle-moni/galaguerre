import type { ActionTarget, GameData, MinionCard, MinionSpotId } from "#api_types/game.types";
import type Game from "#models/game";
import { executeBattlecries } from "#galaguerre/action_engine/execute_battlecries";
import { createMinionState } from "./fixtures.js";
import { createInMemoryGame } from "./in_memory_game.js";
import { refreshAurasAfterMinionPlayed } from "#galaguerre/passive_engine/refresh_passive_auras";

export type PlayerKey = "playerOne" | "playerTwo";

export interface BattlecryRunOptions {
    spotId?: MinionSpotId;
    actionTarget?: ActionTarget;
    actor?: PlayerKey;
}

export const runBattlecry = (
    data: GameData,
    card: MinionCard,
    options: BattlecryRunOptions = {},
): { game: Game; gameEnded: boolean } => {
    const spotId = options.spotId ?? "SPOT_1";
    const actor = options.actor ?? "playerOne";
    const game = createInMemoryGame(data);
    const player = game.data[actor];

    player.hand = player.hand.filter((handCard) => handCard.uuid !== card.uuid);
    player.board[spotId] = createMinionState(card, { placedAtRound: game.data.currentRound });
    refreshAurasAfterMinionPlayed(game, player, spotId);

    const { gameEnded } = executeBattlecries(game, player, card, options.actionTarget);

    if (gameEnded) {
        game.isFinished = true;
        game.data.state = "FINISHED";
    }

    return { game, gameEnded };
};
