import { useEffect, useState } from "react";

interface CountdownTimerProps {
    endsAt?: number;
    label?: string;
    title?: string;
}

export function useCountdownTimer(endsAt?: number) {
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

    return secondsLeft;
}

export const CountdownTimer = ({ endsAt, label, title }: CountdownTimerProps) => {
    const secondsLeft = useCountdownTimer(endsAt);

    if (secondsLeft === null) return null;

    return (
        <span className="countdown-timer text-sm font-semibold tabular-nums" title={title}>
            {label ? `${label} ` : ""}
            {secondsLeft}s
        </span>
    );
};
