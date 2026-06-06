import { useEffect } from "react";
import type { GameStore } from "~/stores/GameStore";

export const useTargetSelectionCancel = (
    store: GameStore,
    containerRef: React.RefObject<HTMLElement | null>,
) => {
    const isSelectingTarget = store.targetSelectionStore.isSelectingTarget;

    useEffect(() => {
        if (!isSelectingTarget) return;

        const handlePointerDown = (event: PointerEvent) => {
            if (!store.targetSelectionStore.isSelectingTarget) return;

            const target = event.target;
            if (!(target instanceof Element)) return;

            if (target.closest("[data-target-zone]")) return;

            store.targetSelectionStore.cancelTargetSelection();
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            if (!store.targetSelectionStore.isSelectingTarget) return;

            store.targetSelectionStore.cancelTargetSelection();
        };

        const container = containerRef.current;
        container?.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            container?.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [containerRef, isSelectingTarget, store]);
};
