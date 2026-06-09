import { useEffect, useState } from "react";

interface CountdownTimerProps {
    endsAt?: number;
    label?: string;
}

export const CountdownTimer = ({ endsAt, label }: CountdownTimerProps) => {
    const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

    useEffect(() => {
        if (!endsAt) {
            setSecondsLeft(null);
            return;
        }

        const update = () => {
            const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
            setSecondsLeft(remaining);
        };

        update();
        const interval = setInterval(update, 250);

        return () => clearInterval(interval);
    }, [endsAt]);

    if (secondsLeft === null) return null;

    return (
        <span className="text-sm font-semibold tabular-nums">
            {label ? `${label} ` : ""}
            {secondsLeft}s
        </span>
    );
};
