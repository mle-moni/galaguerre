import type { GameData } from "#api_types/game.types";

export const cloneGameData = (data: GameData): GameData => structuredClone(data);
