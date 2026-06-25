import type { GameLogEntryType } from "#api_types/game.types";
import Game from "#models/game";

/** Both players must have completed their opening turn. */
export const MIN_ROUND_FOR_REWARDS = 2;

/** Turn-one lethal and similar decisive games can still earn rewards. */
export const MIN_ACTIONS_FOR_SHORT_GAME_REWARDS = 3;

const REWARD_ELIGIBLE_ACTION_TYPES = new Set<GameLogEntryType>([
    "PLAY_CARD",
    "ATTACK",
    "PASS_TURN",
]);

const countMeaningfulActions = (game: Game): number =>
    game.data.actionLog.filter((entry) => REWARD_ELIGIBLE_ACTION_TYPES.has(entry.type)).length;

export const gameQualifiesForRewards = (game: Game): boolean => {
    if (game.data.currentRound >= MIN_ROUND_FOR_REWARDS) {
        return true;
    }

    return countMeaningfulActions(game) >= MIN_ACTIONS_FOR_SHORT_GAME_REWARDS;
};
