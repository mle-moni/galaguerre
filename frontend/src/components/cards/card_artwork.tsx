import clsx from "clsx";
import { SmoothLoopVideo } from "~/components/smooth_loop_video";
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
    const mediaClassName = clsx("card-artwork", className);

    if (showVideo && goldenVideoUrl) {
        return (
            <SmoothLoopVideo
                src={goldenVideoUrl}
                poster={imageUrl}
                alt={alt}
                className={mediaClassName}
            />
        );
    }

    return (
        <img
            className={mediaClassName}
            src={imageUrl}
            alt={alt}
            draggable={false}
            loading={imageLoading}
        />
    );
};
