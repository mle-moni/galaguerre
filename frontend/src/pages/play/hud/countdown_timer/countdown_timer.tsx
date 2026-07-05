import { useEffect, useState } from "react";
import { PLAY_TIMER_URL } from "../../play_game_constants.js";
import "./countdown_timer.css";

interface CountdownTimerProps {
    endsAt?: number;
    label?: string;
    title?: string;
    displayOffsetSeconds?: number;
}

interface CountdownTimerFaceProps {
    seconds: number;
    title?: string;
    displayOffsetSeconds?: number;
}

export function getDisplayedCountdownSeconds(seconds: number, displayOffsetSeconds = 0): number {
    return Math.max(0, seconds - displayOffsetSeconds);
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

export const CountdownTimerFace = ({
    seconds,
    title,
    displayOffsetSeconds = 0,
}: CountdownTimerFaceProps) => {
    const displayedSeconds = getDisplayedCountdownSeconds(seconds, displayOffsetSeconds);
    const digits = String(displayedSeconds).length;

    return (
        <span className="countdown-timer__face" title={title}>
            <img src={PLAY_TIMER_URL} alt="" className="countdown-timer__icon" draggable={false} />
            <span className="countdown-timer__value" data-digits={digits} aria-hidden="true">
                {displayedSeconds}
            </span>
        </span>
    );
};

export const CountdownTimer = ({
    endsAt,
    label,
    title,
    displayOffsetSeconds = 0,
}: CountdownTimerProps) => {
    const secondsLeft = useCountdownTimer(endsAt);

    if (secondsLeft === null) return null;

    return (
        <span className="countdown-timer" title={title}>
            {label ? <span className="countdown-timer__label">{label}</span> : null}
            <CountdownTimerFace seconds={secondsLeft} displayOffsetSeconds={displayOffsetSeconds} />
        </span>
    );
};
