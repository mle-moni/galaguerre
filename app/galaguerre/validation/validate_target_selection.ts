import { GALAGUERRE_TARGET_SELECTION_MODES } from "../galaguerre.types.js";
import type Target from "#models/target";

export const validateTargetSelection = (target: Target, isTargeted: boolean): string | null => {
    const hasMaxTargets = target.maxTargets !== null;
    const hasSelectionMode = target.targetSelectionMode !== null;

    if (hasMaxTargets !== hasSelectionMode) {
        return "maxTargets and targetSelectionMode must both be set or both be null";
    }

    if (!hasMaxTargets) return null;

    if (target.maxTargets! < 1) {
        return "maxTargets must be >= 1";
    }

    if (
        !GALAGUERRE_TARGET_SELECTION_MODES.includes(
            target.targetSelectionMode as (typeof GALAGUERRE_TARGET_SELECTION_MODES)[number],
        )
    ) {
        return `targetSelectionMode ${target.targetSelectionMode} is not supported`;
    }

    if (isTargeted) {
        return "targetSelectionMode is incompatible with isTargeted actions";
    }

    return null;
};
