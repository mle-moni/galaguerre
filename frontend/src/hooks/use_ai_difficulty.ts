import { useCallback, useState } from "react";
import { AI_DIFFICULTIES, DEFAULT_AI_DIFFICULTY, type AiDifficulty } from "#api_types/game.types";

const STORAGE_KEY = "galaguerre:ai-difficulty";

const isAiDifficulty = (value: string | null): value is AiDifficulty =>
    value !== null && (AI_DIFFICULTIES as readonly string[]).includes(value);

const readStoredDifficulty = (): AiDifficulty => {
    if (typeof localStorage === "undefined") return DEFAULT_AI_DIFFICULTY;

    const stored = localStorage.getItem(STORAGE_KEY);
    return isAiDifficulty(stored) ? stored : DEFAULT_AI_DIFFICULTY;
};

/** Difficulté d'IA choisie, mémorisée d'une partie à l'autre. */
export const useAiDifficulty = () => {
    const [difficulty, setDifficultyState] = useState<AiDifficulty>(readStoredDifficulty);

    const setDifficulty = useCallback((next: AiDifficulty) => {
        setDifficultyState(next);
        if (typeof localStorage !== "undefined") {
            localStorage.setItem(STORAGE_KEY, next);
        }
    }, []);

    return { difficulty, setDifficulty };
};
