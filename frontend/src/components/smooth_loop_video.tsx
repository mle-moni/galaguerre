import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import "./smooth_loop_video.css";

/** Crossfade window before the end of the clip (seconds). */
const LOOP_FADE_SECONDS = 0.45;

interface SmoothLoopVideoProps {
    src: string;
    poster: string;
    alt: string;
    /** Sizing/layout classes — same ones you'd put on a static <img>. */
    className?: string;
}

export const SmoothLoopVideo = ({ src, poster, alt, className }: SmoothLoopVideoProps) => {
    const primaryRef = useRef<HTMLVideoElement>(null);
    const secondaryRef = useRef<HTMLVideoElement>(null);
    const [activeIndex, setActiveIndex] = useState<0 | 1>(0);
    const fadingRef = useRef(false);

    useEffect(() => {
        fadingRef.current = false;
        setActiveIndex(0);

        const primary = primaryRef.current;
        const secondary = secondaryRef.current;
        if (!primary || !secondary) return;

        primary.currentTime = 0;
        secondary.pause();
        secondary.currentTime = 0;
        void primary.play().catch(() => undefined);
    }, [src]);

    useEffect(() => {
        const active = activeIndex === 0 ? primaryRef.current : secondaryRef.current;
        const standby = activeIndex === 0 ? secondaryRef.current : primaryRef.current;
        if (!active || !standby) return;

        const onTimeUpdate = () => {
            if (fadingRef.current || !Number.isFinite(active.duration) || active.duration <= 0) {
                return;
            }

            const remaining = active.duration - active.currentTime;
            if (remaining > LOOP_FADE_SECONDS) return;

            fadingRef.current = true;
            standby.currentTime = 0;
            void standby.play().catch(() => undefined);
            setActiveIndex((current) => (current === 0 ? 1 : 0));

            window.setTimeout(() => {
                fadingRef.current = false;
                active.pause();
            }, LOOP_FADE_SECONDS * 1000);
        };

        active.addEventListener("timeupdate", onTimeUpdate);
        return () => active.removeEventListener("timeupdate", onTimeUpdate);
    }, [activeIndex, src]);

    return (
        <div className={clsx("smooth-loop-video", className)} aria-label={alt || undefined}>
            <img
                className="smooth-loop-video__media"
                src={poster}
                alt=""
                aria-hidden
                draggable={false}
            />
            <video
                ref={primaryRef}
                className={clsx(
                    "smooth-loop-video__media",
                    activeIndex === 0 && "smooth-loop-video__media--active",
                )}
                src={src}
                poster={poster}
                muted
                playsInline
                preload="auto"
                aria-hidden={activeIndex !== 0}
            />
            <video
                ref={secondaryRef}
                className={clsx(
                    "smooth-loop-video__media",
                    activeIndex === 1 && "smooth-loop-video__media--active",
                )}
                src={src}
                poster={poster}
                muted
                playsInline
                preload="auto"
                aria-hidden={activeIndex !== 1}
            />
        </div>
    );
};
