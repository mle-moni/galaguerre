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

export interface HeroExplosionEventInput {
    type: "HERO_EXPLOSION";
    at: AnimationRect;
    owner: SpotOwner;
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

export type AbilityImpactTone =
    | "DAMAGE"
    | "DESTROY"
    | "HEAL"
    | "BOOST"
    | "SILENCE"
    | "RECONVERSION";

export interface ProjectileEventInput {
    type: "PROJECTILE";
    kind: AbilityImpactTone;
    from: AnimationRect;
    to: AnimationRect;
    delayMs?: number;
}

export interface MultiProjectileEventInput {
    type: "MULTI_PROJECTILE";
    kind: AbilityImpactTone;
    from: AnimationRect;
    tos: AnimationRect[];
}

export interface ExplosionEventInput {
    type: "EXPLOSION";
    kind: AbilityImpactTone;
    ats: AnimationRect[];
}

export interface CloudEventInput {
    type: "CLOUD";
    ats: AnimationRect[];
}

export type VisualAnimationEventInput =
    | CardFlightEventInput
    | AttackEventInput
    | FloatingTextEventInput
    | DeathEventInput
    | HeroExplosionEventInput
    | DrawEventInput
    | TurnBannerEventInput
    | SourcePulseEventInput
    | ProjectileEventInput
    | MultiProjectileEventInput
    | ExplosionEventInput
    | CloudEventInput;

export type VisualAnimationEvent = VisualAnimationEventInput & BaseVisualEvent;
export type CardFlightEvent = CardFlightEventInput & BaseVisualEvent;
export type AttackEvent = AttackEventInput & BaseVisualEvent;
export type FloatingTextEvent = FloatingTextEventInput & BaseVisualEvent;
export type DeathEvent = DeathEventInput & BaseVisualEvent;
export type HeroExplosionEvent = HeroExplosionEventInput & BaseVisualEvent;
export type DrawEvent = DrawEventInput & BaseVisualEvent;
export type TurnBannerEvent = TurnBannerEventInput & BaseVisualEvent;
export type SourcePulseEvent = SourcePulseEventInput & BaseVisualEvent;
export type ProjectileEvent = ProjectileEventInput & BaseVisualEvent;
export type MultiProjectileEvent = MultiProjectileEventInput & BaseVisualEvent;
export type ExplosionEvent = ExplosionEventInput & BaseVisualEvent;
export type CloudEvent = CloudEventInput & BaseVisualEvent;

import { getShotDurationMs } from "~/pages/play/animations/shot_durations";

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

    /**
     * Plays an event and invokes `onReveal` partway through (e.g. swap board
     * under an opaque transform cloud, then finish the fade-out).
     */
    async playWithMidpointReveal(
        event: VisualAnimationEventInput,
        revealAtRatio: number,
        onReveal: () => void | Promise<void>,
        reducedMotion = false,
    ): Promise<void> {
        const animated = withAnimationId(event);
        this.events.push(animated);

        const duration = getShotDurationMs(event, reducedMotion);
        const revealAt = Math.round(duration * Math.min(Math.max(revealAtRatio, 0), 1));

        if (revealAt > 0) {
            await wait(revealAt);
        }
        await onReveal();

        const remaining = duration - revealAt;
        if (remaining > 0) {
            await wait(remaining);
        }

        this.remove(animated.id);
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
