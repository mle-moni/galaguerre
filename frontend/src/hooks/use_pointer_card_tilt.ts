import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type CSSProperties,
    type PointerEvent,
    type RefObject,
} from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const MAX_TILT_DEG = 12;

const DEFAULT_STYLE: CSSProperties = {
    "--mx": "50%",
    "--my": "50%",
    "--pos-x": "50%",
    "--pos-y": "50%",
    "--rx": "0deg",
    "--ry": "0deg",
} as CSSProperties;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export const usePointerCardTilt = (containerRef: RefObject<HTMLElement | null>, enabled = true) => {
    const [reducedMotion, setReducedMotion] = useState(() =>
        typeof window !== "undefined" ? window.matchMedia(REDUCED_MOTION_QUERY).matches : false,
    );
    const [style, setStyle] = useState<CSSProperties>(DEFAULT_STYLE);

    useEffect(() => {
        const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
        const handleChange = (event: MediaQueryListEvent) => {
            setReducedMotion(event.matches);
        };

        setReducedMotion(mediaQuery.matches);
        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);

    const active = enabled && !reducedMotion;

    const reset = useCallback(() => {
        setStyle(DEFAULT_STYLE);
    }, []);

    const onPointerMove = useCallback(
        (event: PointerEvent<HTMLElement>) => {
            if (!active) return;

            const el = containerRef.current;
            if (!el) return;

            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;

            const px = clamp01((event.clientX - rect.left) / rect.width);
            const py = clamp01((event.clientY - rect.top) / rect.height);

            const rx = (0.5 - py) * (MAX_TILT_DEG * 2);
            const ry = (px - 0.5) * (MAX_TILT_DEG * 2);

            setStyle({
                "--mx": `${(px * 100).toFixed(2)}%`,
                "--my": `${(py * 100).toFixed(2)}%`,
                "--pos-x": `${(px * 100).toFixed(2)}%`,
                "--pos-y": `${(py * 100).toFixed(2)}%`,
                "--rx": `${rx.toFixed(2)}deg`,
                "--ry": `${ry.toFixed(2)}deg`,
            } as CSSProperties);
        },
        [active, containerRef],
    );

    const onPointerLeave = useCallback(() => {
        if (!active) return;
        reset();
    }, [active, reset]);

    useEffect(() => {
        if (!active) {
            reset();
        }
    }, [active, reset]);

    return useMemo(
        () => ({
            style,
            onPointerMove,
            onPointerLeave,
            reducedMotion,
            active,
        }),
        [style, onPointerMove, onPointerLeave, reducedMotion, active],
    );
};
