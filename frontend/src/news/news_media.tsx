import { SmoothLoopVideo } from "~/components/smooth_loop_video";

interface NewsMediaProps {
    imageUrl: string;
    goldenVideoUrl?: string | null;
    alt: string;
    className?: string;
}

export const NewsMedia = ({ imageUrl, goldenVideoUrl, alt, className }: NewsMediaProps) => {
    if (goldenVideoUrl) {
        return (
            <SmoothLoopVideo
                src={goldenVideoUrl}
                poster={imageUrl}
                alt={alt}
                className={className}
            />
        );
    }

    return <img src={imageUrl} alt={alt} className={className} />;
};
