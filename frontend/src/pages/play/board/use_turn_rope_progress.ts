import { useEffect, useState } from "react";

export const TURN_ROPE_DURATION_MS = 30_000;

export function useTurnRopeProgress(endsAt?: number): number {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!endsAt) {
            setProgress(0);
            return;
        }

        const update = () => {
            const remainingMs = endsAt - Date.now();
            if (remainingMs <= 0 || remainingMs > TURN_ROPE_DURATION_MS) {
                setProgress(0);
                return;
            }

            setProgress(1 - remainingMs / TURN_ROPE_DURATION_MS);
        };

        update();
        const interval = setInterval(update, 50);

        return () => clearInterval(interval);
    }, [endsAt]);

    return progress;
}
