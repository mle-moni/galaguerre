import { useLayoutEffect } from "react";
import { resolveTargetFromPoint } from "~/helpers/resolve_target_from_point";
import type { GameStore } from "~/stores/GameStore";

export const useTargetingArrow = (store: GameStore) => {
    const isDragging = store.targetingArrowStore.isDragging;

    useLayoutEffect(() => {
        if (!isDragging) return;

        const handlePointerMove = (event: PointerEvent) => {
            store.targetingArrowStore.updateCursor(event.clientX, event.clientY);
        };

        const handlePointerUp = (event: PointerEvent) => {
            const actionTarget = resolveTargetFromPoint(event.clientX, event.clientY);

            if (actionTarget && store.targetSelectionStore.canSelectTarget(actionTarget)) {
                store.targetSelectionStore.confirmTarget(actionTarget);
            } else {
                store.targetSelectionStore.cancelTargetSelection();
            }

            store.targetingArrowStore.endDrag();
        };

        document.addEventListener("pointermove", handlePointerMove);
        document.addEventListener("pointerup", handlePointerUp);

        return () => {
            document.removeEventListener("pointermove", handlePointerMove);
            document.removeEventListener("pointerup", handlePointerUp);
        };
    }, [isDragging, store]);
};
