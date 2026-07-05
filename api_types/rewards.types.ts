export const GOLD_COINS_PER_VICTORY = 40;
export const GOLD_COINS_PER_DEFEAT = 10;
export const GOLD_COINS_TRAINING_VICTORY = 20;
export const GOLD_COINS_TRAINING_DEFEAT = 5;
export const GOLD_COINS_PER_PACK = 100;

export const computePlayerGoldReward = ({
    isWinner,
    isDraw,
    isTraining,
}: {
    isWinner: boolean;
    isDraw: boolean;
    isTraining: boolean;
}): number => {
    if (isDraw) {
        return isTraining ? GOLD_COINS_TRAINING_DEFEAT : GOLD_COINS_PER_DEFEAT;
    }

    if (isWinner) {
        return isTraining ? GOLD_COINS_TRAINING_VICTORY : GOLD_COINS_PER_VICTORY;
    }

    return isTraining ? GOLD_COINS_TRAINING_DEFEAT : GOLD_COINS_PER_DEFEAT;
};
export const DAILY_TIMEZONE = "Europe/Paris";

export interface GameRewardPlayerResult {
    goldCoins: number;
    packs: number;
}

export interface GameRewardResult {
    playerOne: GameRewardPlayerResult;
    playerTwo: GameRewardPlayerResult;
}

export interface ApiClaimDailyPackResponse {
    unopenedCount: number;
}

export interface ApiBuyPackResponse {
    goldCoins: number;
    unopenedCount: number;
}
