import { DEFAULT_AI_DIFFICULTY, type AiDifficulty } from "#api_types/game.types";

export const TRAINING_AI_USER_ID = -42;

/**
 * Chaque niveau d'IA a son propre nom : le joueur voit ainsi contre quel adversaire il joue,
 * en cours de partie comme dans l'historique.
 */
export const TRAINING_AI_PSEUDOS: Record<AiDifficulty, string> = {
    BEGINNER: "R2-D2 (IA)",
    ADVANCED: "WALL-E (IA)",
};

/** Pseudo par défaut. Les parties créées avant l'ajout des difficultés gardent le leur ("IA"). */
export const TRAINING_AI_PSEUDO = TRAINING_AI_PSEUDOS[DEFAULT_AI_DIFFICULTY];

export const getTrainingAiPseudo = (difficulty: AiDifficulty): string =>
    TRAINING_AI_PSEUDOS[difficulty];
