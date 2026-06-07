import { useEffect } from "react";
import type { GameStore } from "~/stores/GameStore";

export const useTargetSelectionCancel = (store: GameStore) => {
    const isSelectingTarget = store.targetSelectionStore.isSelectingTarget;

    useEffect(() => {
        if (!isSelectingTarget) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            if (!store.targetSelectionStore.isSelectingTarget) return;

            store.targetSelectionStore.cancelTargetSelection();
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isSelectingTarget, store]);
};
