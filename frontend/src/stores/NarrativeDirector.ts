import type { ApiGame } from "#api_types/game.types";
import type { GamePresentationUpdate, NarrativeBeat } from "#api_types/game_narrative.types";
import { makeAutoObservable } from "mobx";
import { choreographShots, isCombatLungePhase } from "~/pages/play/animations/choreograph_shots.js";
import { effectsToShots } from "~/pages/play/animations/effects_to_shots.js";
import { readGameAnimationSnapshot } from "~/pages/play/animations/game_animation_snapshot.js";
import { ANIMATION_STORE } from "./store_singletons.js";
import type { GameStore } from "./GameStore.js";

const BEAT_GAP_MS = 0;
const REDUCED_MOTION_GAP_MS = 0;

/** Placement beats: show the resulting board state while the flight animation plays. */
const appliesStateBeforeAnimations = (beat: NarrativeBeat) => beat.kind === "PLAY_CARD";

const shouldRewindToSceneStart = (presentation: GamePresentationUpdate) =>
    presentation.beats[0]?.kind !== "PLAY_CARD";

const usesCombatStateReveal = (beat: NarrativeBeat) =>
    beat.kind === "ATTACK" || beat.effects.some((effect) => effect.type === "ATTACK_LUNGE");

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
        this.skipRequested = true;
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

    private async playBeatAnimations(
        beat: NarrativeBeat,
        authoritativeGame: ApiGame,
        reducedMotion: boolean,
        revealStateFirst: boolean,
    ) {
        const snapshot = readGameAnimationSnapshot();
        const shots = effectsToShots(
            beat.effects,
            snapshot,
            this.gameStore.displayGame,
            this.gameStore.user.id,
        );
        if (shots.length === 0) return;

        const stateAfter = this.mergeGameData(authoritativeGame, beat.stateAfter);
        const revealCombatStateAfterLunge = usesCombatStateReveal(beat) && !revealStateFirst;

        for (const phase of choreographShots(shots)) {
            if (phase.length === 1) {
                await ANIMATION_STORE.playSequential(phase, reducedMotion);
            } else {
                await ANIMATION_STORE.playParallel(phase, reducedMotion);
            }

            if (revealCombatStateAfterLunge && isCombatLungePhase(phase)) {
                this.gameStore.setDisplayGame(stateAfter);
                await waitForLayout();
            }
        }
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

        try {
            if (shouldRewindToSceneStart(presentation)) {
                this.gameStore.setDisplayGame(
                    this.mergeGameData(authoritativeGame, presentation.stateBefore),
                );
                await waitForLayout();
            }

            for (const beat of presentation.beats) {
                if (this.skipRequested) break;

                const revealStateFirst = appliesStateBeforeAnimations(beat);

                if (revealStateFirst) {
                    this.gameStore.setDisplayGame(
                        this.mergeGameData(authoritativeGame, beat.stateAfter),
                    );
                    await waitForLayout();
                }

                if (!reducedMotion) {
                    await this.playBeatAnimations(
                        beat,
                        authoritativeGame,
                        reducedMotion,
                        revealStateFirst,
                    );
                }

                if (!revealStateFirst && !usesCombatStateReveal(beat)) {
                    this.gameStore.setDisplayGame(
                        this.mergeGameData(authoritativeGame, beat.stateAfter),
                    );
                    await waitForLayout();
                }

                await wait(beatGap);
            }

            this.gameStore.setDisplayGame(this.gameStore.authoritativeGame);
        } catch (error) {
            console.error("NarrativeDirector failed to play scene", error);
            this.gameStore.setDisplayGame(this.gameStore.authoritativeGame);
        } finally {
            this.gameStore.setNarrativePlaying(false);
            this.isPlaying = false;
            this.skipRequested = false;

            this.gameStore.combatActionQueue.flush();

            if (this.queue.length > 0) {
                void this.processQueue();
            }
        }
    }
}
