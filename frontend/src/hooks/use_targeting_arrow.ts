import { useLayoutEffect } from "react";
import {
    cancelArrowTargeting,
    resolveAndConfirmArrowTarget,
} from "~/helpers/arrow_target_validity";
import type { GameStore } from "~/stores/GameStore";

export const useTargetingArrow = (store: GameStore) => {
    const isDragging = store.targetingArrowStore.isDragging;

    useLayoutEffect(() => {
        if (!isDragging) return;

        const handlePointerMove = (event: PointerEvent) => {
            store.targetingArrowStore.updateCursor(event.clientX, event.clientY);
        };

        const handlePointerUp = (event: PointerEvent) => {
            resolveAndConfirmArrowTarget(store, event.clientX, event.clientY);
        };

        const handlePointerCancel = () => {
            cancelArrowTargeting(store);
            store.targetingArrowStore.endDrag();
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
