import { useEffect } from "react";
import { cancelArrowTargeting } from "~/helpers/arrow_target_validity";
import type { GameStore } from "~/stores/GameStore";

export const useTargetSelectionCancel = (store: GameStore) => {
    const isCancelable =
        store.isNarrativePlaying ||
        store.targetSelectionStore.isArmed ||
        store.targetSelectionStore.isSelectingTarget ||
        store.cardDragStore.isShowingMinionPlayHint ||
        store.cardDragStore.isShowingSpellOrWeaponPlayHint ||
        store.minionDragStore.isAttacking ||
        store.weaponDragStore.isAttacking;

    useEffect(() => {
        if (!isCancelable) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;

            if (
                store.minionDragStore.isAttacking ||
                store.weaponDragStore.isAttacking ||
                store.targetSelectionStore.isArmed ||
                store.targetSelectionStore.isSelectingTarget ||
                store.cardDragStore.isShowingMinionPlayHint ||
                store.cardDragStore.isShowingSpellOrWeaponPlayHint
            ) {
                cancelArrowTargeting(store);
                return;
            }

            if (store.isNarrativePlaying) {
                store.skipNarrative();
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isCancelable, store]);
};
