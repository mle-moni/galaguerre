import { useEffect, useState } from "react";

/** Viewport wide enough to show 5 full-size cards (220px) with gaps. */
export const PACK_OPENING_FULL_SIZE_QUERY = "(min-width: 1220px)";

export const usePackOpeningFullSize = () => {
    const [useFullSize, setUseFullSize] = useState(() =>
        typeof window !== "undefined"
            ? window.matchMedia(PACK_OPENING_FULL_SIZE_QUERY).matches
            : false,
    );

    useEffect(() => {
        const mediaQuery = window.matchMedia(PACK_OPENING_FULL_SIZE_QUERY);
        const handleChange = (event: MediaQueryListEvent) => {
            setUseFullSize(event.matches);
        };

        setUseFullSize(mediaQuery.matches);
        mediaQuery.addEventListener("change", handleChange);

        return () => {
            mediaQuery.removeEventListener("change", handleChange);
        };
    }, []);

    return useFullSize;
};
