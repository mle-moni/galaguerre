import type { ApiGame } from "#api_types/game.types";
import type { GamePresentationUpdate } from "#api_types/game_narrative.types";
import { makeAutoObservable } from "mobx";
import { effectsToShots } from "~/pages/play/animations/effects_to_shots.js";
import { readGameAnimationSnapshot } from "~/pages/play/animations/game_animation_snapshot.js";
import { ANIMATION_STORE } from "./store_singletons.js";
import type { GameStore } from "./GameStore.js";

const BEAT_GAP_MS = 80;
const REDUCED_MOTION_GAP_MS = 0;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const waitForLayout = () =>
    new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
        });
    });

const prefersReducedMotion = () =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface QueuedScene {
    presentation: GamePresentationUpdate;
    authoritativeGame: ApiGame;
}

export class NarrativeDirector {
    private queue: QueuedScene[] = [];
    private isPlaying = false;
    private skipRequested = false;

    constructor(private readonly gameStore: GameStore) {
        makeAutoObservable(this);
    }

    get narrativePlaying() {
        return this.isPlaying;
    }

    enqueue(presentation: GamePresentationUpdate, authoritativeGame: ApiGame) {
        this.queue.push({ presentation, authoritativeGame });
        void this.processQueue();
    }

    skipCurrentScene() {
        this.skipRequested = true;
        ANIMATION_STORE.clear();
    }

    clear() {
        this.queue = [];
        this.skipRequested = false;
        this.isPlaying = false;
        ANIMATION_STORE.clear();
    }

    private mergeGameData(
        authoritativeGame: ApiGame,
        data: typeof authoritativeGame.data,
    ): ApiGame {
        return {
            ...authoritativeGame,
            data,
        };
    }

    private async processQueue() {
        if (this.isPlaying) return;

        const nextScene = this.queue.shift();
        if (!nextScene) return;

        this.isPlaying = true;
        this.skipRequested = false;
        this.gameStore.setNarrativePlaying(true);

        const { presentation, authoritativeGame } = nextScene;
        const reducedMotion = prefersReducedMotion();
        const beatGap = reducedMotion ? REDUCED_MOTION_GAP_MS : BEAT_GAP_MS;

        this.gameStore.setDisplayGame(
            this.mergeGameData(authoritativeGame, presentation.stateBefore),
        );
        await waitForLayout();

        for (const beat of presentation.beats) {
            if (this.skipRequested) break;

            if (!reducedMotion) {
                const snapshot = readGameAnimationSnapshot();
                const shots = effectsToShots(
                    beat.effects,
                    snapshot,
                    this.gameStore.displayGame,
                    this.gameStore.user.id,
                );
                if (shots.length > 0) {
                    await ANIMATION_STORE.playSequential(shots);
                }
            }

            this.gameStore.setDisplayGame(this.mergeGameData(authoritativeGame, beat.stateAfter));
            await waitForLayout();
            await wait(beatGap);
        }

        this.gameStore.setDisplayGame(authoritativeGame);
        this.gameStore.setNarrativePlaying(false);
        this.isPlaying = false;
        this.skipRequested = false;

        if (this.queue.length > 0) {
            void this.processQueue();
        }
    }
}
