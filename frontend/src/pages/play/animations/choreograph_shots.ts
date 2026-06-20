import type { VisualAnimationEventInput } from "~/stores/AnimationStore";

const isLeadShot = (shot: VisualAnimationEventInput) =>
    shot.type === "CARD_FLIGHT" ||
    shot.type === "DRAW" ||
    shot.type === "ATTACK" ||
    shot.type === "TURN_BANNER";

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
