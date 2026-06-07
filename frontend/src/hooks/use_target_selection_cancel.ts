import { useEffect } from "react";
import { cancelArrowTargeting } from "~/helpers/arrow_target_validity";
import type { GameStore } from "~/stores/GameStore";

export const useTargetSelectionCancel = (store: GameStore) => {
    const isArrowTargetingActive =
        store.targetSelectionStore.isSelectingTarget ||
        store.minionDragStore.isAttacking ||
        store.weaponDragStore.isAttacking;

    useEffect(() => {
        if (!isArrowTargetingActive) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;

            cancelArrowTargeting(store);
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isArrowTargetingActive, store]);
};
