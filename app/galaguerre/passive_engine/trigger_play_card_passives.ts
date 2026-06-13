import type { GamePlayer, PlayerCard } from "#api_types/game.types";
import type Game from "#models/game";
import { collectPassiveTriggers } from "./collect_passive_triggers.js";
import { executePassiveActions } from "./execute_passive_actions.js";

export const triggerPlayCardPassives = (
    game: Game,
    playingPlayer: GamePlayer,
    playedCard: PlayerCard,
): { gameEnded: boolean } => {
    const entries = collectPassiveTriggers(game, "PLAY_CARD", playingPlayer, playedCard);
    return executePassiveActions(game, entries);
};
