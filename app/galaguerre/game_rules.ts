import type { GamePlayer } from "#api_types/game.types";

export const MAX_HAND_SIZE = 10;

export const isHandFull = (player: GamePlayer): boolean => player.hand.length >= MAX_HAND_SIZE;
