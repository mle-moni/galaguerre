import type { GameData } from "#api_types/game.types";
import type {
    GamePresentationUpdate,
    NarrativeBeat,
    NarrativeBeatKind,
    NarrativeEffect,
} from "#api_types/game_narrative.types";
import { randomUUID } from "node:crypto";
import { cloneGameData } from "./clone_game_data.js";
import { compactPresentationBeats } from "./compact_presentation_beats.js";

export class GameNarrativeRecorder {
    private stateBefore: GameData | null = null;
    private beats: NarrativeBeat[] = [];
    private currentBeat: {
        id: string;
        kind: NarrativeBeatKind;
        logEntryId?: string;
        effects: NarrativeEffect[];
    } | null = null;

    reset(stateBefore: GameData): void {
        this.stateBefore = cloneGameData(stateBefore);
        this.beats = [];
        this.currentBeat = null;
    }

    beginBeat(kind: NarrativeBeatKind, options?: { logEntryId?: string }): void {
        if (this.currentBeat) {
            throw new Error("Cannot begin a new narrative beat before ending the current one");
        }

        this.currentBeat = {
            id: randomUUID(),
            kind,
            logEntryId: options?.logEntryId,
            effects: [],
        };
    }

    hasCurrentBeat(): boolean {
        return this.currentBeat !== null;
    }

    recordEffect(effect: NarrativeEffect): void {
        if (!this.currentBeat) {
            return;
        }

        this.currentBeat.effects.push(effect);
    }

    endBeat(game: { data: GameData }): void {
        if (!this.currentBeat) {
            throw new Error("Cannot end a narrative beat that was not started");
        }

        this.beats.push({
            ...this.currentBeat,
            stateAfter: cloneGameData(game.data),
        });
        this.currentBeat = null;
    }

    hasBeats(): boolean {
        return this.beats.length > 0;
    }

    build(
        game: { data: GameData; updatedAt?: { toISO?: () => string | null } },
        updateId?: string,
    ): GamePresentationUpdate | null {
        if (!this.stateBefore || !this.hasBeats()) {
            return null;
        }

        const resolvedUpdateId =
            updateId ??
            (typeof game.updatedAt?.toISO === "function"
                ? game.updatedAt.toISO()
                : String(Date.now()));

        return {
            updateId: resolvedUpdateId ?? String(Date.now()),
            stateBefore: this.stateBefore,
            beats: compactPresentationBeats(this.beats),
            stateAfter: cloneGameData(game.data),
        };
    }

    clear(): void {
        this.stateBefore = null;
        this.beats = [];
        this.currentBeat = null;
    }
}

export const createGameNarrativeRecorder = (): GameNarrativeRecorder => new GameNarrativeRecorder();
