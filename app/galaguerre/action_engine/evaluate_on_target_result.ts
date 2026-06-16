import { getBoardMinionStats, matchesComparison } from "#api_types/comparison_matching";
import type { MinionState } from "#api_types/game.types";
import type { OnTargetResultDefinition } from "#galaguerre/card_definition.schema";

export type TargetEffectOutcome = {
    gameEnded: boolean;
    minionKilled?: boolean;
    survivingMinion?: MinionState;
};

export const shouldTriggerOnTargetResult = (
    trigger: OnTargetResultDefinition,
    outcome: TargetEffectOutcome,
): boolean => {
    if (outcome.minionKilled === undefined) return false;

    if (trigger.when === "KILLED") {
        return outcome.minionKilled;
    }

    if (outcome.minionKilled || !outcome.survivingMinion) {
        return false;
    }

    return matchesComparison(
        getBoardMinionStats(outcome.survivingMinion),
        trigger.healthComparison,
    );
};
