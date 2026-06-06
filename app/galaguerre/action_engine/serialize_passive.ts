import type { PassiveSnapshot } from "#api_types/game.types";
import type Passive from "#models/passive";
import { serializeAction } from "./serialize_action.js";
import { serializeBoostWithTarget } from "./serialize_boost_with_target.js";

export const serializePassive = (passive: Passive): PassiveSnapshot => {
    if (passive.type === "ACTION") {
        return {
            type: "ACTION",
            triggersOn: passive.triggersOn,
            action: passive.action ? serializeAction(passive.action) : null,
            passiveBoost: null,
        };
    }

    return {
        type: "BOOST",
        triggersOn: null,
        action: null,
        passiveBoost: serializeBoostWithTarget(passive.boost),
    };
};
