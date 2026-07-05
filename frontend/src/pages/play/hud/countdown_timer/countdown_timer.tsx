import { useEffect, useState } from "react";
import { PLAY_TIMER_URL } from "../../play_game_constants.js";
import "./countdown_timer.css";

interface CountdownTimerProps {
    endsAt?: number;
    label?: string;
    title?: string;
}

interface CountdownTimerFaceProps {
    seconds: number;
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

export const CountdownTimerFace = ({ seconds, title }: CountdownTimerFaceProps) => {
    const digits = String(seconds).length;

    return (
        <span className="countdown-timer__face" title={title}>
            <img src={PLAY_TIMER_URL} alt="" className="countdown-timer__icon" draggable={false} />
            <span className="countdown-timer__value" data-digits={digits} aria-hidden="true">
                {seconds}
            </span>
        </span>
    );
};

export const CountdownTimer = ({ endsAt, label, title }: CountdownTimerProps) => {
    const secondsLeft = useCountdownTimer(endsAt);

    if (secondsLeft === null) return null;

    return (
        <span className="countdown-timer" title={title}>
            {label ? <span className="countdown-timer__label">{label}</span> : null}
            <CountdownTimerFace seconds={secondsLeft} />
        </span>
    );
};
