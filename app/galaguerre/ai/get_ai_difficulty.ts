import { DEFAULT_AI_DIFFICULTY, type AiDifficulty } from "#api_types/game.types";
import type Game from "#models/game";

/** Les parties créées avant l'ajout du réglage n'ont pas de champ : elles restent en Débutant. */
export const getAiDifficulty = (game: Game): AiDifficulty =>
    game.data.aiDifficulty ?? DEFAULT_AI_DIFFICULTY;

export const isAdvancedAi = (game: Game): boolean => getAiDifficulty(game) === "ADVANCED";
