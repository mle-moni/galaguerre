import type { ApiGame, SpotOwner } from "#api_types/game.types";
import type { GamePresentationUpdate, NarrativeBeat } from "#api_types/game_narrative.types";
import { makeAutoObservable } from "mobx";
import { choreographShots, isCombatLungePhase } from "~/pages/play/animations/choreograph_shots.js";
import { effectsToShots } from "~/pages/play/animations/effects_to_shots.js";
import { readGameAnimationSnapshot } from "~/pages/play/animations/game_animation_snapshot.js";
import { resolveHeroRect } from "~/pages/play/animations/resolve_rects.js";
import { extractPlayedCardFromBeat } from "~/pages/play/hud/played_card_reveal/extract_played_card_from_beat.js";
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

const getDeadHeroOwners = (game: ApiGame, userId: number): SpotOwner[] => {
    const { playerOne, playerTwo } = game.data;
    const owners: SpotOwner[] = [];

    if (playerOne.health <= 0) {
        owners.push(playerOne.userId === userId ? "PLAYER" : "OPPONENT");
    }

    if (playerTwo.health <= 0) {
        owners.push(playerTwo.userId === userId ? "PLAYER" : "OPPONENT");
    }

    return owners;
};

interface QueuedScene {
    presentation: GamePresentationUpdate;
    authoritativeGame: ApiGame;
}

export class NarrativeDirector {
    private queue: QueuedScene[] = [];
    private isPlaying = false;
    private skipRequested = false;
    isGameEndAnimationPlaying = false;
    dyingHeroOwners: SpotOwner[] = [];

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

    async playGameEndExplosions(game: ApiGame): Promise<void> {
        const deadOwners = getDeadHeroOwners(game, this.gameStore.user.id);
        if (deadOwners.length === 0) return;

        const managesNarrative = !this.isPlaying;

        if (managesNarrative) {
            this.skipRequested = false;
        } else if (this.skipRequested) {
            return;
        }

        this.dyingHeroOwners = deadOwners;
        this.isGameEndAnimationPlaying = true;

        if (managesNarrative) {
            this.gameStore.setNarrativePlaying(true);
        }

        try {
            await waitForLayout();

            if (this.skipRequested) return;

            const snapshot = readGameAnimationSnapshot();
            const events = deadOwners.map((owner) => ({
                type: "HERO_EXPLOSION" as const,
                at: resolveHeroRect(owner, snapshot),
                owner,
            }));

            const reducedMotion = prefersReducedMotion();
            await ANIMATION_STORE.playParallel(events, reducedMotion);
        } finally {
            this.dyingHeroOwners = [];
            this.isGameEndAnimationPlaying = false;

            if (managesNarrative) {
                this.gameStore.setNarrativePlaying(false);
            }
        }
    }

    skipCurrentScene() {
        this.skipRequested = true;
        this.isGameEndAnimationPlaying = false;
        this.dyingHeroOwners = [];
        ANIMATION_STORE.clear();
    }

    clear() {
        this.queue = [];
        this.skipRequested = true;
        this.isPlaying = false;
        this.isGameEndAnimationPlaying = false;
        this.dyingHeroOwners = [];
        ANIMATION_STORE.clear();
        this.gameStore.playedCardRevealStore.clear();
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

                    const playedCard = extractPlayedCardFromBeat(
                        beat,
                        authoritativeGame,
                        this.gameStore.user.id,
                    );
                    if (playedCard) {
                        this.gameStore.playedCardRevealStore.reveal(
                            playedCard.card,
                            playedCard.playerId,
                        );
                    }
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

            if (authoritativeGame.data.state === "FINISHED" && !this.skipRequested) {
                await this.playGameEndExplosions(authoritativeGame);
            }
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
