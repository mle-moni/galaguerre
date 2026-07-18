import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import "./card_artwork.css";

interface CardArtworkProps {
    imageUrl: string;
    goldenVideoUrl?: string | null;
    isGolden?: boolean;
    alt: string;
    className?: string;
    imageLoading?: "eager" | "lazy";
}

/** Crossfade window before the end of the clip (seconds). */
const LOOP_FADE_SECONDS = 0.25;

interface SmoothLoopVideoProps {
    src: string;
    poster: string;
    alt: string;
    className?: string;
}

const SmoothLoopVideo = ({ src, poster, alt, className }: SmoothLoopVideoProps) => {
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
        <div className={clsx("card-artwork-loop", className)} aria-label={alt}>
            <video
                ref={primaryRef}
                className={clsx(
                    "card-artwork",
                    "card-artwork--video",
                    activeIndex === 0 && "card-artwork--active",
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
                    "card-artwork",
                    "card-artwork--video",
                    activeIndex === 1 && "card-artwork--active",
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

export const CardArtwork = ({
    imageUrl,
    goldenVideoUrl,
    isGolden = false,
    alt,
    className,
    imageLoading,
}: CardArtworkProps) => {
    const showVideo = isGolden && Boolean(goldenVideoUrl);

    if (showVideo && goldenVideoUrl) {
        return (
            <SmoothLoopVideo
                src={goldenVideoUrl}
                poster={imageUrl}
                alt={alt}
                className={className}
            />
        );
    }

    return (
        <img
            className={clsx("card-artwork", className)}
            src={imageUrl}
            alt={alt}
            draggable={false}
            loading={imageLoading}
        />
    );
};
