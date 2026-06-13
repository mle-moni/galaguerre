import type { GamePlayer, PassiveTriggersOn, PlayerCard } from "#api_types/game.types";
import type Game from "#models/game";
import { collectPassiveTriggers } from "./collect_passive_triggers.js";
import { executePassiveActions } from "./execute_passive_actions.js";

export const triggerPassives = (
    game: Game,
    triggersOn: PassiveTriggersOn,
    activePlayer?: GamePlayer,
    playedCard?: PlayerCard,
): { gameEnded: boolean } => {
    const entries = collectPassiveTriggers(game, triggersOn, activePlayer, playedCard);
    return executePassiveActions(game, entries);
};
