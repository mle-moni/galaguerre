import type {
    ActionTarget,
    GamePlayer,
    MinionState,
    SpotOwner,
    TargetSnapshot,
} from "#api_types/game.types";
import {
    hasRandomLimitedTarget,
    heroMatchesTarget,
    minionMatchesTarget,
    shouldExcludeSourceMinion,
    canOpponentDirectlyTargetMinion,
} from "#api_types/target_matching";
import { shuffleArray } from "../../utils/array.js";
import { getTargetBoardEntries } from "./apply_mass_minion_effects.js";

export { hasRandomLimitedTarget };

const collectHeroActionTargets = (
    target: TargetSnapshot,
    _player: GamePlayer,
    _opponent: GamePlayer,
): ActionTarget[] => {
    const results: ActionTarget[] = [];

    if (heroMatchesTarget(target, false)) {
        results.push({ minionUuid: null, owner: "PLAYER" });
    }
    if (heroMatchesTarget(target, true)) {
        results.push({ minionUuid: null, owner: "OPPONENT" });
    }

    return results;
};

const collectMinionActionTargets = (
    target: TargetSnapshot,
    player: GamePlayer,
    opponent: GamePlayer,
    sourceMinion?: MinionState,
): ActionTarget[] => {
    const results: ActionTarget[] = [];

    for (const { board, isOpponent } of getTargetBoardEntries(target, player, opponent)) {
        const owner: SpotOwner = isOpponent ? "OPPONENT" : "PLAYER";

        for (const minion of board) {
            if (shouldExcludeSourceMinion(target, sourceMinion, minion)) continue;
            if (!minionMatchesTarget(minion, target, isOpponent)) continue;
            if (isOpponent && !canOpponentDirectlyTargetMinion(minion)) continue;

            results.push({ minionUuid: minion.uuid, owner });
        }
    }

    return results;
};

export const collectEligibleActionTargets = (
    target: TargetSnapshot,
    player: GamePlayer,
    opponent: GamePlayer,
    sourceMinion?: MinionState,
): ActionTarget[] => {
    switch (target.type) {
        case "HERO":
            return collectHeroActionTargets(target, player, opponent);
        case "MINION":
            return collectMinionActionTargets(target, player, opponent, sourceMinion);
        case "ALL":
            return [
                ...collectHeroActionTargets(target, player, opponent),
                ...collectMinionActionTargets(target, player, opponent, sourceMinion),
            ];
        default:
            return [];
    }
};

export const pickRandomLimitedTargets = (
    target: TargetSnapshot,
    player: GamePlayer,
    opponent: GamePlayer,
    sourceMinion?: MinionState,
): ActionTarget[] => {
    if (!hasRandomLimitedTarget(target)) return [];

    const eligible = collectEligibleActionTargets(target, player, opponent, sourceMinion);
    return shuffleArray(eligible).slice(0, target.maxTargets!);
};
