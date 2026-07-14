import { useRef } from "react";

const DRAG_CLICK_SUPPRESSION_THRESHOLD_PX = 6;

interface PointerCoordinates {
    clientX: number;
    clientY: number;
}

export const useDragClickSuppression = () => {
    const originRef = useRef<PointerCoordinates | null>(null);
    const suppressClickRef = useRef(false);

    const begin = (point: PointerCoordinates) => {
        originRef.current = { clientX: point.clientX, clientY: point.clientY };
        suppressClickRef.current = false;
    };

    const track = (point: PointerCoordinates) => {
        const origin = originRef.current;
        if (!origin) return;

        const distance = Math.hypot(point.clientX - origin.clientX, point.clientY - origin.clientY);
        if (distance >= DRAG_CLICK_SUPPRESSION_THRESHOLD_PX) {
            suppressClickRef.current = true;
        }
    };

    const finish = () => {
        originRef.current = null;
    };

    const reset = () => {
        finish();
        suppressClickRef.current = false;
    };

    const consumeClickSuppression = () => {
        if (!suppressClickRef.current) return false;
        suppressClickRef.current = false;
        return true;
    };

    return { begin, track, finish, reset, consumeClickSuppression };
};
