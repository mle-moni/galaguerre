import { useLayoutEffect } from "react";
import { resolveAndConfirmArrowTarget } from "~/helpers/arrow_target_validity";
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

        document.addEventListener("pointermove", handlePointerMove);
        document.addEventListener("pointerup", handlePointerUp);

        return () => {
            document.removeEventListener("pointermove", handlePointerMove);
            document.removeEventListener("pointerup", handlePointerUp);
        };
    }, [isDragging, store]);
};
