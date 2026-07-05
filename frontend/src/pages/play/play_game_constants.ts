export const PLAY_MANA_MEDALLION_URL = "/game/mana-medallion.webp";
export const PLAY_DECK_ICON_URL = "/game/deck-actif.webp";

export const MAX_MANA = 10;

export function getMaxMana(currentRound: number): number {
    return Math.min(currentRound, MAX_MANA);
}
