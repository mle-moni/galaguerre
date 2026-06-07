import { useEffect, useState } from "react";

export const NARROW_SCREEN_QUERY = "(max-width: 639px)";

export const useIsNarrowScreen = () => {
    const [isNarrowScreen, setIsNarrowScreen] = useState(() =>
        typeof window !== "undefined" ? window.matchMedia(NARROW_SCREEN_QUERY).matches : false,
    );

    useEffect(() => {
        const mediaQuery = window.matchMedia(NARROW_SCREEN_QUERY);
        const handleChange = (event: MediaQueryListEvent) => {
            setIsNarrowScreen(event.matches);
        };

        setIsNarrowScreen(mediaQuery.matches);
        mediaQuery.addEventListener("change", handleChange);

        return () => {
            mediaQuery.removeEventListener("change", handleChange);
        };
    }, []);

    return isNarrowScreen;
};
