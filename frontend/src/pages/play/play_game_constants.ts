export const PLAY_MANA_MEDALLION_URL = "/game/mana-medallion.webp";
export const PLAY_DECK_ICON_URL = "/game/deck-actif.webp";
export const PLAY_TIMER_URL = "/game/timer.webp";

/** Shown turn timer runs this many seconds ahead of the real deadline. */
export const TURN_TIMER_DISPLAY_OFFSET_SECONDS = 2;

export const MAX_MANA = 10;

export function getMaxMana(currentRound: number): number {
    return Math.min(currentRound, MAX_MANA);
}
