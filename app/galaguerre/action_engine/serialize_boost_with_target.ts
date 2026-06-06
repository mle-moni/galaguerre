import type { PassiveBoostSnapshot } from "#api_types/game.types";
import type Boost from "#models/boost";
import { serializeBoost } from "./boost_utils.js";
import { serializeTarget } from "./serialize_target.js";

export const serializeBoostWithTarget = (
    boost: Boost | null | undefined,
): PassiveBoostSnapshot | null => {
    if (!boost) return null;

    const toolToTarget = boost.toolToTargets?.[0];
    const serializedBoost = serializeBoost(boost);
    if (!serializedBoost) return null;

    return {
        boost: serializedBoost,
        target: serializeTarget(toolToTarget?.target),
    };
};
