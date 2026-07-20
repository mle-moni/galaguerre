import { useLayoutEffect } from "react";
import { finishTargetedSpellArrow } from "~/helpers/arrow_target_validity";
import { isPointInsideHandCancelZone } from "~/helpers/is_point_inside_hand_cancel_zone";
import type { GameStore } from "~/stores/GameStore";

/**
 * Owns pointer move/up for targeted spells dragged from hand.
 * Morphs card ↔ targeting arrow when leaving / re-entering the hand cancel zone.
 */
export const useTargetedSpellHandDrag = (store: GameStore) => {
    const isDragging = store.cardDragStore.isDraggingTargetedSpell;

    useLayoutEffect(() => {
        if (!isDragging) return;

        const handlePointerMove = (event: PointerEvent) => {
            const point = { x: event.clientX, y: event.clientY };
            store.cardDragStore.updateTargetedSpellDrag(point, isPointInsideHandCancelZone(point));
        };

        const handlePointerUp = (event: PointerEvent) => {
            finishTargetedSpellArrow(store, event.clientX, event.clientY);
        };

        const handlePointerCancel = () => {
            store.cardDragStore.cancelTargetedSpellDrag();
        };

        document.addEventListener("pointermove", handlePointerMove);
        document.addEventListener("pointerup", handlePointerUp);
        document.addEventListener("pointercancel", handlePointerCancel);

        return () => {
            document.removeEventListener("pointermove", handlePointerMove);
            document.removeEventListener("pointerup", handlePointerUp);
            document.removeEventListener("pointercancel", handlePointerCancel);
        };
    }, [isDragging, store]);
};
