import { useEffect, useState } from "react";

const MOBILE_PORTRAIT_QUERY = "(max-width: 640px) and (orientation: portrait)";

export const useIsMobilePortrait = () => {
    const [isMobilePortrait, setIsMobilePortrait] = useState(() =>
        typeof window !== "undefined" ? window.matchMedia(MOBILE_PORTRAIT_QUERY).matches : false,
    );

    useEffect(() => {
        const mediaQuery = window.matchMedia(MOBILE_PORTRAIT_QUERY);
        const handleChange = (event: MediaQueryListEvent) => {
            setIsMobilePortrait(event.matches);
        };

        setIsMobilePortrait(mediaQuery.matches);
        mediaQuery.addEventListener("change", handleChange);

        return () => {
            mediaQuery.removeEventListener("change", handleChange);
        };
    }, []);

    return isMobilePortrait;
};
