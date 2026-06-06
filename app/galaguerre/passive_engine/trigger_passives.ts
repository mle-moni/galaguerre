import type { GamePlayer, PassiveTriggersOn } from "#api_types/game.types";
import type Game from "#models/game";
import { collectPassiveTriggers } from "./collect_passive_triggers.js";
import { executePassiveActions } from "./execute_passive_actions.js";

export const triggerPassives = (
    game: Game,
    triggersOn: PassiveTriggersOn,
    activePlayer?: GamePlayer,
): { gameEnded: boolean } => {
    const entries = collectPassiveTriggers(game, triggersOn, activePlayer);
    return executePassiveActions(game, entries);
};
