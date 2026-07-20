import { useEffect } from "react";
import { cancelArrowTargeting } from "~/helpers/arrow_target_validity";
import type { GameStore } from "~/stores/GameStore";

export const useArmedCardInteraction = (store: GameStore) => {
    const isArmed = store.targetSelectionStore.isArmed;
    const hasMinionPlayHint = store.cardDragStore.isShowingMinionPlayHint;
    const hasSpellOrWeaponPlayHint = store.cardDragStore.isShowingSpellOrWeaponPlayHint;
    const isMinionAttacking = store.minionDragStore.isAttacking;
    const isWeaponAttacking = store.weaponDragStore.isAttacking;
    const isMyTurn = store.isMyTurn;

    useEffect(() => {
        if (!isMyTurn) {
            store.targetSelectionStore.disarm();
            store.cardDragStore.clearPlayHints();
            store.cardDragStore.cancelTargetedSpellDrag();
        }
    }, [isMyTurn, store]);

    useEffect(() => {
        if (
            !isArmed &&
            !hasMinionPlayHint &&
            !hasSpellOrWeaponPlayHint &&
            !isMinionAttacking &&
            !isWeaponAttacking
        ) {
            return;
        }

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target;
            if (!(target instanceof Element)) return;

            if (target.closest("[data-playing-card]")) return;
            if (target.closest("[data-target-zone]")) return;
            if (target.closest("[data-board-insertion-zone]")) return;

            cancelArrowTargeting(store);
        };

        document.addEventListener("pointerdown", handlePointerDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
        };
    }, [
        hasMinionPlayHint,
        hasSpellOrWeaponPlayHint,
        isArmed,
        isMinionAttacking,
        isWeaponAttacking,
        store,
    ]);
};
