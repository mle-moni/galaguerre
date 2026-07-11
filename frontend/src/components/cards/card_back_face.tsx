import { Image } from "@mantine/core";
import clsx from "clsx";
import type { CSSProperties } from "react";
import "./card_back_face.css";

export const CARD_BACK_IMAGE_URL = "/card-covers/card-back.webp";

interface CardBackFaceProps {
    cardUuid?: string;
    className?: string;
    style?: CSSProperties;
}

export const CardBackFace = ({ cardUuid, className, style }: CardBackFaceProps) => (
    <div
        data-playing-card
        data-playing-card-id={cardUuid}
        style={style}
        className={clsx("card-back-face playing-card-face rounded overflow-hidden", className)}
    >
        <Image
            className="h-full w-full object-cover"
            src={CARD_BACK_IMAGE_URL}
            alt=""
            draggable={false}
        />
    </div>
);
