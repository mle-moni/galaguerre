import { useEffect, useState } from "react";

const RELATIVE_TIME_REFRESH_MS = 60_000;

export const useRelativeTimeTick = () => {
    const [tick, setTick] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setTick((current) => current + 1);
        }, RELATIVE_TIME_REFRESH_MS);

        return () => clearInterval(interval);
    }, []);

    return tick;
};
