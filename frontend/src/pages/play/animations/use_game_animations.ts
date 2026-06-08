import type { ApiGame } from "#api_types/game.types";
import { useLayoutEffect, useRef } from "react";
import { ANIMATION_STORE } from "~/stores/store_singletons";
import { deriveGameAnimationEvents } from "./derive_game_animation_events.js";
import {
    type GameAnimationSnapshot,
    readGameAnimationSnapshot,
} from "./game_animation_snapshot.js";

export const useGameAnimations = (game: ApiGame, userId: number) => {
    const previousGameRef = useRef<ApiGame | null>(null);
    const previousSnapshotRef = useRef<GameAnimationSnapshot | null>(null);

    useLayoutEffect(() => {
        const nextSnapshot = readGameAnimationSnapshot();
        const previousGame = previousGameRef.current;
        const previousSnapshot = previousSnapshotRef.current;

        if (previousGame && previousSnapshot && previousGame.updatedAt !== game.updatedAt) {
            ANIMATION_STORE.enqueue(
                deriveGameAnimationEvents({
                    previousGame,
                    nextGame: game,
                    userId,
                    previousSnapshot,
                    nextSnapshot,
                }),
            );
        }

        previousGameRef.current = game;
        previousSnapshotRef.current = nextSnapshot;
    }, [game, userId]);
};
