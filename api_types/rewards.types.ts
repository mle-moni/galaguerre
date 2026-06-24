export const GOLD_COINS_PER_VICTORY = 40;
export const GOLD_COINS_PER_DEFEAT = 10;
export const GOLD_COINS_PER_PACK = 100;
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
