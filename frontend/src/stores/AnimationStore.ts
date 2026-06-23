import type { PlayerCard, SpotOwner } from "#api_types/game.types";
import type { NarrativeTriggerKind } from "#api_types/game_narrative.types";
import { makeAutoObservable } from "mobx";

export interface AnimationRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export type FloatingTone = "damage" | "heal" | "boost" | "mana";

interface BaseVisualEvent {
    id: string;
}

export interface CardFlightEventInput {
    type: "CARD_FLIGHT";
    card: PlayerCard;
    from: AnimationRect;
    to: AnimationRect;
}

export interface AttackEventInput {
    type: "ATTACK";
    card: PlayerCard;
    from: AnimationRect;
    to: AnimationRect;
}

export interface FloatingTextEventInput {
    type: "FLOATING_TEXT";
    at: AnimationRect;
    label: string;
    tone: FloatingTone;
    /** Stagger concurrent numbers on the same target so they remain readable. */
    stackIndex?: number;
}

export interface DeathEventInput {
    type: "DEATH";
    at: AnimationRect;
}

export interface DrawEventInput {
    type: "DRAW";
    from: AnimationRect;
    to: AnimationRect;
    delayMs?: number;
}

export interface TurnBannerEventInput {
    type: "TURN_BANNER";
    label: string;
    owner: SpotOwner;
    at: AnimationRect;
}

export interface SourcePulseEventInput {
    type: "SOURCE_PULSE";
    at: AnimationRect;
    trigger: NarrativeTriggerKind;
}

export type VisualAnimationEventInput =
    | CardFlightEventInput
    | AttackEventInput
    | FloatingTextEventInput
    | DeathEventInput
    | DrawEventInput
    | TurnBannerEventInput
    | SourcePulseEventInput;

export type VisualAnimationEvent = VisualAnimationEventInput & BaseVisualEvent;
export type CardFlightEvent = CardFlightEventInput & BaseVisualEvent;
export type AttackEvent = AttackEventInput & BaseVisualEvent;
export type FloatingTextEvent = FloatingTextEventInput & BaseVisualEvent;
export type DeathEvent = DeathEventInput & BaseVisualEvent;
export type DrawEvent = DrawEventInput & BaseVisualEvent;
export type TurnBannerEvent = TurnBannerEventInput & BaseVisualEvent;
export type SourcePulseEvent = SourcePulseEventInput & BaseVisualEvent;

import { getShotDurationMs } from "~/pages/play/animations/shot_durations.js";

let nextAnimationId = 0;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const withAnimationId = (event: VisualAnimationEventInput): VisualAnimationEvent => ({
    ...event,
    id: `animation-${nextAnimationId++}`,
});

export class AnimationStore {
    events: VisualAnimationEvent[] = [];

    constructor() {
        makeAutoObservable(this);
    }

    enqueue(events: VisualAnimationEventInput[]) {
        if (events.length === 0) return;
        this.events.push(...events.map(withAnimationId));
    }

    async playSequential(
        events: VisualAnimationEventInput[],
        reducedMotion = false,
    ): Promise<void> {
        for (const event of events) {
            await this.playOne(event, reducedMotion);
        }
    }

    async playParallel(events: VisualAnimationEventInput[], reducedMotion = false): Promise<void> {
        if (events.length === 0) return;

        const animated = events.map((event) => withAnimationId(event));
        this.events.push(...animated);

        const duration = Math.max(
            ...events.map((event) => getShotDurationMs(event, reducedMotion)),
        );
        await wait(duration);

        this.removeMany(animated.map((event) => event.id));
    }

    private removeMany(ids: string[]) {
        if (ids.length === 0) return;
        const idSet = new Set(ids);
        this.events = this.events.filter((event) => !idSet.has(event.id));
    }

    private async playOne(event: VisualAnimationEventInput, reducedMotion: boolean): Promise<void> {
        const animated = withAnimationId(event);
        this.events.push(animated);

        await wait(getShotDurationMs(event, reducedMotion));

        this.remove(animated.id);
    }

    remove(id: string) {
        this.events = this.events.filter((event) => event.id !== id);
    }

    clear() {
        this.events = [];
    }
}
