import { useEffect } from "react";
import type { GameStore } from "~/stores/GameStore";

export const useArmedCardInteraction = (store: GameStore) => {
    const isArmed = store.targetSelectionStore.isArmed;
    const hasPendingSpellDrag = store.targetSelectionStore.hasPendingSpellDrag;
    const hasMinionPlayHint = store.cardDragStore.isShowingMinionPlayHint;
    const isMyTurn = store.isMyTurn;

    useEffect(() => {
        if (!isMyTurn) {
            store.targetSelectionStore.disarm();
            store.cardDragStore.clearMinionPlayHint();
        }
    }, [isMyTurn, store]);

    useEffect(() => {
        if (!isArmed && !hasPendingSpellDrag) return;

        const handlePointerMove = (event: PointerEvent) => {
            store.targetSelectionStore.updatePendingSpellDrag(event.clientX, event.clientY);
        };

        const handlePointerUp = () => {
            store.targetSelectionStore.cancelPendingSpellDrag();
        };

        document.addEventListener("pointermove", handlePointerMove);
        document.addEventListener("pointerup", handlePointerUp);

        return () => {
            document.removeEventListener("pointermove", handlePointerMove);
            document.removeEventListener("pointerup", handlePointerUp);
        };
    }, [hasPendingSpellDrag, isArmed, store]);

    useEffect(() => {
        if (!isArmed && !hasMinionPlayHint) return;

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target;
            if (!(target instanceof Element)) return;

            if (target.closest("[data-playing-card]")) return;
            if (target.closest("[data-target-zone]")) return;

            store.targetSelectionStore.disarm();
            store.cardDragStore.clearMinionPlayHint();
        };

        document.addEventListener("pointerdown", handlePointerDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
        };
    }, [hasMinionPlayHint, isArmed, store]);
};
