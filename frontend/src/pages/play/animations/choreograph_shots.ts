import type { VisualAnimationEventInput } from "~/stores/AnimationStore";

const isPoisonousPulseShot = (shot: VisualAnimationEventInput) =>
    shot.type === "SOURCE_PULSE" && shot.trigger === "POISONOUS";

const isLeadShot = (shot: VisualAnimationEventInput) =>
    shot.type === "CARD_FLIGHT" ||
    shot.type === "DRAW" ||
    shot.type === "ATTACK" ||
    shot.type === "TURN_BANNER" ||
    shot.type === "PROJECTILE" ||
    shot.type === "MULTI_PROJECTILE" ||
    shot.type === "EXPLOSION" ||
    shot.type === "CLOUD" ||
    isPoisonousPulseShot(shot);

/**
 * Groups shots into phases: lead moments play alone, impacts play together.
 * Mirrors Hearthstone combat pacing (lunge → simultaneous damage/death feedback).
 */
export const choreographShots = (
    shots: VisualAnimationEventInput[],
): VisualAnimationEventInput[][] => {
    const phases: VisualAnimationEventInput[][] = [];
    let impactBatch: VisualAnimationEventInput[] = [];

    const flushImpact = () => {
        if (impactBatch.length === 0) return;
        phases.push(impactBatch);
        impactBatch = [];
    };

    for (const shot of shots) {
        if (isLeadShot(shot)) {
            flushImpact();
            phases.push([shot]);
            continue;
        }

        impactBatch.push(shot);
    }

    flushImpact();
    return phases;
};

export const isCombatLungePhase = (phase: VisualAnimationEventInput[]) =>
    phase.length === 1 && phase[0]?.type === "ATTACK";

export const isCloudPhase = (phase: VisualAnimationEventInput[]) =>
    phase.length === 1 && phase[0]?.type === "CLOUD";

const ABILITY_VFX_LEAD_TYPES = new Set(["PROJECTILE", "MULTI_PROJECTILE", "EXPLOSION", "CLOUD"]);

export const isAbilityVfxLeadPhase = (phase: VisualAnimationEventInput[]) =>
    phase.length === 1 && phase[0] !== undefined && ABILITY_VFX_LEAD_TYPES.has(phase[0].type);

export const findLastAbilityVfxLeadIndex = (phases: VisualAnimationEventInput[][]): number => {
    let lastIndex = -1;
    for (let index = 0; index < phases.length; index++) {
        if (isAbilityVfxLeadPhase(phases[index]!)) {
            lastIndex = index;
        }
    }
    return lastIndex;
};
