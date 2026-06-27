import type { ApiGameReplay } from "#api_types/game_replay.types";
import type { ApiGame, GameData, GamePlayer } from "#api_types/game.types";
import type { GamePresentationUpdate } from "#api_types/game_narrative.types";
import {
    hideGameDataForUser,
    filterPresentationForUser,
} from "#shared/narrative/filter_presentation_for_user";
import { makeAutoObservable, runInAction } from "mobx";
import { CardDragStore } from "./CardDragStore.js";
import { CombatActionQueueStore } from "./CombatActionQueueStore.js";
import { MinionDragStore } from "./MinionDragStore.js";
import { NarrativeDirector } from "./NarrativeDirector.js";
import { PlayedCardRevealStore } from "./PlayedCardRevealStore.js";
import { PlayerInfosStore } from "./PlayerInfosStore.js";
import { TargetSelectionStore } from "./TargetSelectionStore.js";
import { TargetingArrowStore } from "./TargetingArrowStore.js";
import { WeaponDragStore } from "./WeaponDragStore.js";
import type { GameStore } from "./GameStore.js";

export const REPLAY_STEP_INTERVAL_MS = 1500;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const waitForNarrative = (director: NarrativeDirector) =>
    new Promise<void>((resolve) => {
        const poll = () => {
            if (!director.narrativePlaying) {
                resolve();
                return;
            }
            requestAnimationFrame(poll);
        };
        poll();
    });

export class ReplayStore {
    cardDragStore: CardDragStore;
    minionDragStore: MinionDragStore;
    weaponDragStore: WeaponDragStore;
    playerInfosStore: PlayerInfosStore;
    playedCardRevealStore: PlayedCardRevealStore;
    targetSelectionStore: TargetSelectionStore;
    targetingArrowStore: TargetingArrowStore;
    combatActionQueue: CombatActionQueueStore;
    narrativeDirector: NarrativeDirector;

    private replay: ApiGameReplay | null = null;
    private _displayGame: ApiGame | null = null;
    private _authoritativeGame: ApiGame | null = null;
    perspectiveUserId: number | null = null;
    stepIndex = 0;
    isPlaying = false;
    isNarrativePlaying = false;
    private playLoopToken = 0;

    constructor() {
        const gameStoreRef = this as unknown as GameStore;
        this.cardDragStore = new CardDragStore(gameStoreRef);
        this.minionDragStore = new MinionDragStore(gameStoreRef);
        this.weaponDragStore = new WeaponDragStore(gameStoreRef);
        this.playerInfosStore = new PlayerInfosStore(gameStoreRef);
        this.playedCardRevealStore = new PlayedCardRevealStore();
        this.targetSelectionStore = new TargetSelectionStore(gameStoreRef);
        this.targetingArrowStore = new TargetingArrowStore(gameStoreRef);
        this.combatActionQueue = new CombatActionQueueStore(gameStoreRef);
        this.narrativeDirector = new NarrativeDirector(gameStoreRef);
        makeAutoObservable(this);
    }

    get user() {
        return { id: this.perspectiveUserId ?? 0 };
    }

    get authoritativeGame() {
        if (!this._authoritativeGame) {
            throw new Error("ReplayStore not initialized");
        }
        return this._authoritativeGame;
    }

    get displayGame() {
        return this._displayGame ?? this.authoritativeGame;
    }

    get game() {
        return this.displayGame;
    }

    get isInputBlocked() {
        return true;
    }

    get canPlanCombatAction() {
        return false;
    }

    get isCombatTargeting() {
        return false;
    }

    get steps(): GamePresentationUpdate[] {
        return this.replay?.replay.steps ?? [];
    }

    get maxStepIndex() {
        return this.steps.length;
    }

    get p1() {
        return this.displayGame.data.playerOne;
    }

    get p2() {
        return this.displayGame.data.playerTwo;
    }

    get me() {
        if (this.p1.userId === this.perspectiveUserId) return this.p1;
        return this.p2;
    }

    get opponent() {
        if (this.p1.userId === this.perspectiveUserId) return this.p2;
        return this.p1;
    }

    get authoritativeMe(): GamePlayer {
        const { playerOne, playerTwo } = this.authoritativeGame.data;
        return playerOne.userId === this.perspectiveUserId ? playerOne : playerTwo;
    }

    get authoritativeOpponent(): GamePlayer {
        const { playerOne, playerTwo } = this.authoritativeGame.data;
        return playerOne.userId === this.perspectiveUserId ? playerTwo : playerOne;
    }

    get isMyTurn() {
        return false;
    }

    get isCardHoverPreviewDisabled() {
        return true;
    }

    init(replay: ApiGameReplay, perspectiveUserId: number, stepIndex = 0) {
        const clampedStep = Math.max(0, Math.min(stepIndex, replay.replay.steps.length));

        if (
            this.replay?.gameId === replay.gameId &&
            this.perspectiveUserId === perspectiveUserId &&
            this.stepIndex === clampedStep &&
            this._authoritativeGame
        ) {
            return;
        }

        this.replay = replay;
        this.perspectiveUserId = perspectiveUserId;
        this.stepIndex = clampedStep;
        this.isPlaying = false;
        this.playLoopToken++;
        this.narrativeDirector.clear();
        this.syncDisplayToCurrentStep();
    }

    clear() {
        this.pause();
        this.replay = null;
        this.perspectiveUserId = null;
        this._authoritativeGame = null;
        this._displayGame = null;
        this.stepIndex = 0;
        this.narrativeDirector.clear();
    }

    setDisplayGame(game: ApiGame) {
        this._displayGame = game;
    }

    setNarrativePlaying(isPlaying: boolean) {
        this.isNarrativePlaying = isPlaying;
    }

    switchPerspective(userId: number) {
        this.pause();
        this.perspectiveUserId = userId;
        this.syncDisplayToCurrentStep();
    }

    getStateDataForStep(index: number): GameData {
        const steps = this.steps;
        if (steps.length === 0) {
            throw new Error("Replay has no steps");
        }

        const raw = index === 0 ? steps[0]!.stateBefore : steps[index - 1]!.stateAfter;

        return hideGameDataForUser(raw, this.perspectiveUserId!);
    }

    private buildApiGame(data: GameData): ApiGame {
        if (!this.replay || this.perspectiveUserId === null) {
            throw new Error("ReplayStore not initialized");
        }

        const filtered = hideGameDataForUser(data, this.perspectiveUserId);

        return {
            id: this.replay.gameId,
            playerOneId: this.replay.playerOne.userId,
            playerTwoId: this.replay.playerTwo.userId,
            data: filtered,
            isFinished: filtered.state === "FINISHED",
            createdAt: "",
            updatedAt: "",
            endedAt: null,
        };
    }

    syncDisplayToCurrentStep() {
        const data = this.getStateDataForStep(this.stepIndex);
        const game = this.buildApiGame(data);
        this._authoritativeGame = game;
        this._displayGame = game;
    }

    play() {
        if (this.stepIndex >= this.maxStepIndex) {
            return;
        }
        this.isPlaying = true;
        void this.runPlayLoop();
    }

    pause() {
        this.isPlaying = false;
        this.playLoopToken++;
        this.narrativeDirector.skipCurrentScene();
    }

    async stepForward() {
        this.pause();
        if (this.stepIndex >= this.maxStepIndex) return;
        await this.animateCurrentStep();
        runInAction(() => {
            this.stepIndex++;
            this.syncDisplayToCurrentStep();
        });
    }

    stepBackward() {
        this.pause();
        if (this.stepIndex <= 0) return;
        this.stepIndex--;
        this.syncDisplayToCurrentStep();
    }

    seekTo(index: number) {
        this.pause();
        const clamped = Math.max(0, Math.min(index, this.maxStepIndex));
        this.stepIndex = clamped;
        this.syncDisplayToCurrentStep();
    }

    private async animateCurrentStep() {
        const step = this.steps[this.stepIndex];
        if (!step || this.perspectiveUserId === null) return;

        const presentation = filterPresentationForUser(step, this.perspectiveUserId);
        const authoritativeGame = this.buildApiGame(presentation.stateAfter);
        this._authoritativeGame = authoritativeGame;
        this.narrativeDirector.enqueue(presentation, authoritativeGame);
        await waitForNarrative(this.narrativeDirector);
    }

    private async runPlayLoop() {
        const token = ++this.playLoopToken;

        while (this.isPlaying && this.stepIndex < this.maxStepIndex) {
            await this.animateCurrentStep();
            if (token !== this.playLoopToken || !this.isPlaying) return;

            runInAction(() => {
                this.stepIndex++;
                this.syncDisplayToCurrentStep();
            });

            if (this.stepIndex >= this.maxStepIndex) {
                runInAction(() => {
                    this.isPlaying = false;
                });
                return;
            }

            await wait(REPLAY_STEP_INTERVAL_MS);
            if (token !== this.playLoopToken || !this.isPlaying) return;
        }

        runInAction(() => {
            this.isPlaying = false;
        });
    }

    getStepLabel(index: number): string {
        const steps = this.steps;
        if (steps.length === 0) return "Début";

        if (index === 0) {
            const round = steps[0]!.stateBefore.currentRound;
            return round > 0 ? `Tour ${round} — Début` : "Début de partie";
        }

        const step = steps[index - 1]!;
        const round = step.stateAfter.currentRound;
        const kind = step.beats[0]?.kind ?? "ACTION";
        const kindLabels: Record<string, string> = {
            PLAY_CARD: "Carte jouée",
            CAST_WHEN_DRAWN: "Lancé quand pioché",
            ATTACK: "Attaque",
            PASS_TURN: "Fin de tour",
            TURN_BEGIN: "Début de tour",
            DRAW: "Pioche",
            OVERDRAW: "Surpioche",
            MINION_DEATH: "Mort de monstre",
            TRIGGER: "Effet",
        };
        return `Tour ${round} — ${kindLabels[kind] ?? kind}`;
    }

    // Stubs for GameStore interface used by visual components
    getMinionBoardBackgroundColor() {
        return "black";
    }

    getMinionBoardTargetHighlight() {
        return "none" as const;
    }

    getHeroTargetHighlight() {
        return "none" as const;
    }

    handleDrop() {}
    handleBoardIndexDrop() {}
    requestPassTurn() {}
}

export const REPLAY_STORE = new ReplayStore();
