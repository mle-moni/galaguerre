import type { VisualAnimationEventInput } from "~/stores/AnimationStore";

/** Seconds — single source of truth for overlay transitions and narrative pacing. */
export const ANIMATION_TIMING = {
    CARD_FLIGHT: { normal: 0.28, reduced: 0.12 },
    DRAW: { normal: 0.26, reduced: 0.12 },
    ATTACK: { normal: 0.32, reduced: 0.16 },
    FLOATING_TEXT: { normal: 0.52, reduced: 0.28 },
    DEATH: { normal: 0.32, reduced: 0.16 },
    HERO_EXPLOSION: { normal: 2, reduced: 1 },
    TURN_BANNER: { normal: 0.8, reduced: 0.5 },
    SOURCE_PULSE: { normal: 0.3, reduced: 0.14 },
    PROJECTILE: { normal: 0.42, reduced: 0.16 },
    MULTI_PROJECTILE: { normal: 0.48, reduced: 0.18 },
    EXPLOSION: { normal: 0.4, reduced: 0.16 },
    CLOUD: { normal: 0.9, reduced: 0.28 },
} as const;

export const getShotDurationSec = (
    type: VisualAnimationEventInput["type"],
    reducedMotion: boolean,
): number => {
    const timing = ANIMATION_TIMING[type] ?? ANIMATION_TIMING.SOURCE_PULSE;
    return reducedMotion ? timing.reduced : timing.normal;
};

export const FLOATING_TEXT_STACK_DELAY_MS = 120;
export const MULTI_PROJECTILE_STAGGER_MS = 50;
export const CLOUD_STAGGER_MS = 40;

export const getShotDurationMs = (
    event: VisualAnimationEventInput,
    reducedMotion: boolean,
): number => {
    const baseMs = Math.round(getShotDurationSec(event.type, reducedMotion) * 1000);
    const drawDelayMs = event.type === "DRAW" && !reducedMotion ? event.delayMs ?? 0 : 0;
    const projectileDelayMs =
        event.type === "PROJECTILE" && !reducedMotion ? event.delayMs ?? 0 : 0;
    const floatingTextDelayMs =
        event.type === "FLOATING_TEXT" && !reducedMotion
            ? (event.stackIndex ?? 0) * FLOATING_TEXT_STACK_DELAY_MS
            : 0;
    const multiProjectileExtraMs =
        event.type === "MULTI_PROJECTILE" && !reducedMotion && event.tos.length > 1
            ? (event.tos.length - 1) * MULTI_PROJECTILE_STAGGER_MS
            : 0;
    const cloudExtraMs =
        event.type === "CLOUD" && !reducedMotion && event.ats.length > 1
            ? (event.ats.length - 1) * CLOUD_STAGGER_MS
            : 0;

    return (
        baseMs +
        drawDelayMs +
        projectileDelayMs +
        floatingTextDelayMs +
        multiProjectileExtraMs +
        cloudExtraMs
    );
};
