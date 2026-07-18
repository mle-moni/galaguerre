import clsx from "clsx";
import "./card_artwork.css";

interface CardArtworkProps {
    imageUrl: string;
    goldenVideoUrl?: string | null;
    isGolden?: boolean;
    alt: string;
    className?: string;
    imageLoading?: "eager" | "lazy";
}

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
            <video
                className={clsx("card-artwork", "card-artwork--video", className)}
                src={goldenVideoUrl}
                poster={imageUrl}
                muted
                loop
                autoPlay
                playsInline
                aria-label={alt}
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
