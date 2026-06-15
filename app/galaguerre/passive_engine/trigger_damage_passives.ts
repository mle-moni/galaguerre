import type { PassiveTriggerEvent } from "#api_types/target_matching";
import type Game from "#models/game";
import { triggerPassives } from "./trigger_passives.js";

export const triggerDamagePassives = (
    game: Game,
    event: PassiveTriggerEvent,
): { gameEnded: boolean } => {
    return triggerPassives(game, "DAMAGE", undefined, undefined, event);
};
