import type Target from "#models/target";

export const validateTargetExcludeSelf = (target: Target): string | null => {
    if (!target.excludeSelf) return null;

    if (target.type !== "MINION") {
        return "excludeSelf is only supported for MINION targets";
    }

    return null;
};
