import type { GamePlayer, PassiveTriggersOn, PlayerCard } from "#api_types/game.types";
import type { PassiveTriggerEvent } from "#api_types/target_matching";
import type Game from "#models/game";
import { collectPassiveTriggers } from "./collect_passive_triggers.js";
import { executePassiveActions } from "./execute_passive_actions.js";

export const triggerPassives = (
    game: Game,
    triggersOn: PassiveTriggersOn,
    activePlayer?: GamePlayer,
    playedCard?: PlayerCard,
    event?: PassiveTriggerEvent,
): { gameEnded: boolean } => {
    const entries = collectPassiveTriggers(game, triggersOn, activePlayer, playedCard, event);
    return executePassiveActions(game, entries, event);
};
