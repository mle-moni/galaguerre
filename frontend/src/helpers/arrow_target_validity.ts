import type { ActionTarget } from "#api_types/game.types";
import { isPointInsideHandCancelZone } from "~/helpers/is_point_inside_hand_cancel_zone";
import { resolveTargetFromPoint } from "~/helpers/resolve_target_from_point";
import type { GameStore } from "~/stores/GameStore";
import type { TargetValidity } from "~/stores/TargetSelectionStore";

export const getArrowTargetValidity = (store: GameStore, x: number, y: number): TargetValidity => {
    if (store.targetSelectionStore.isSelectingTarget) {
        return store.targetSelectionStore.getTargetValidityAtPoint(x, y);
    }

    if (store.minionDragStore.isAttacking) {
        return store.minionDragStore.getTargetValidityAtPoint(x, y);
    }

    if (store.weaponDragStore.isAttacking) {
        return store.weaponDragStore.getTargetValidityAtPoint(x, y);
    }

    return "none";
};

export const confirmArrowTarget = (store: GameStore, actionTarget: ActionTarget) => {
    if (store.targetSelectionStore.isSelectingTarget) {
        store.targetSelectionStore.confirmTarget(actionTarget);
        return;
    }

    if (store.minionDragStore.isAttacking) {
        store.minionDragStore.confirmTarget(actionTarget);
        return;
    }

    if (store.weaponDragStore.isAttacking) {
        store.weaponDragStore.confirmTarget(actionTarget);
    }
};

export const cancelArrowTargeting = (store: GameStore) => {
    if (store.cardDragStore.isDraggingTargetedSpell) {
        store.cardDragStore.cancelTargetedSpellDrag();
        return;
    }

    if (store.targetSelectionStore.isSelectingTarget) {
        store.targetSelectionStore.cancelTargetSelection();
        return;
    }

    if (store.targetSelectionStore.isArmed) {
        store.targetSelectionStore.disarm();
        return;
    }

    if (store.minionDragStore.isAttacking) {
        store.minionDragStore.cancelAttack();
        return;
    }

    if (store.weaponDragStore.isAttacking) {
        store.weaponDragStore.cancelAttack();
        return;
    }

    if (store.cardDragStore.isShowingMinionPlayHint) {
        store.cardDragStore.clearMinionPlayHint();
        return;
    }

    if (store.cardDragStore.isShowingSpellOrWeaponPlayHint) {
        store.cardDragStore.clearSpellOrWeaponPlayHint();
    }
};

export const resolveAndConfirmArrowTarget = (store: GameStore, x: number, y: number) => {
    if (
        store.targetSelectionStore.pendingPlay?.kind === "SPELL" &&
        isPointInsideHandCancelZone({ x, y })
    ) {
        cancelArrowTargeting(store);
        store.targetingArrowStore.endDrag();
        return;
    }

    const actionTarget = resolveTargetFromPoint(x, y);

    if (actionTarget && getArrowTargetValidity(store, x, y) === "valid") {
        confirmArrowTarget(store, actionTarget);
    } else if (store.targetSelectionStore.pendingPlay?.kind !== "MINION") {
        cancelArrowTargeting(store);
    }

    store.targetingArrowStore.endDrag();
};

/** Completes a targeted-spell hand drag (card ↔ arrow morph). */
export const finishTargetedSpellArrow = (store: GameStore, x: number, y: number) => {
    const drag = store.cardDragStore.targetedSpellDrag;
    if (!drag) return;

    const isOverHand = isPointInsideHandCancelZone({ x, y });
    if (isOverHand || !drag.isArrowActive) {
        store.cardDragStore.cancelTargetedSpellDrag();
        return;
    }

    // Keep targetedSpellDrag until after confirm/cancel so useTargetingArrow stays skipped.
    const actionTarget = resolveTargetFromPoint(x, y);
    if (actionTarget && getArrowTargetValidity(store, x, y) === "valid") {
        confirmArrowTarget(store, actionTarget);
    } else {
        store.cardDragStore.cancelTargetedSpellDrag();
    }

    store.targetingArrowStore.endDrag();
};
