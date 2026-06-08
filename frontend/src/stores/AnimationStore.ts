import type { PlayerCard, SpotOwner } from "#api_types/game.types";
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
}

export interface DeathEventInput {
    type: "DEATH";
    at: AnimationRect;
}

export interface DrawEventInput {
    type: "DRAW";
    from: AnimationRect;
    to: AnimationRect;
}

export interface TurnBannerEventInput {
    type: "TURN_BANNER";
    label: string;
    owner: SpotOwner;
    at: AnimationRect;
}

export type VisualAnimationEventInput =
    | CardFlightEventInput
    | AttackEventInput
    | FloatingTextEventInput
    | DeathEventInput
    | DrawEventInput
    | TurnBannerEventInput;

export type VisualAnimationEvent = VisualAnimationEventInput & BaseVisualEvent;
export type CardFlightEvent = CardFlightEventInput & BaseVisualEvent;
export type AttackEvent = AttackEventInput & BaseVisualEvent;
export type FloatingTextEvent = FloatingTextEventInput & BaseVisualEvent;
export type DeathEvent = DeathEventInput & BaseVisualEvent;
export type DrawEvent = DrawEventInput & BaseVisualEvent;
export type TurnBannerEvent = TurnBannerEventInput & BaseVisualEvent;

let nextAnimationId = 0;

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

    remove(id: string) {
        this.events = this.events.filter((event) => event.id !== id);
    }

    clear() {
        this.events = [];
    }
}
