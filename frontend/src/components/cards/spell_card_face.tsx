import "./card_faces.css";

import type { SpellCard } from "#api_types/game.types";
import { Image } from "@mantine/core";
import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";

interface SpellCardFaceProps {
    card: SpellCard;
    className?: string;
    style?: CSSProperties;
    onClick?: () => void;
    onPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
    wrapper?: (content: ReactNode) => ReactNode;
}

export const SpellCardFace = ({
    card,
    className,
    style,
    onClick,
    onPointerDown,
    wrapper = (content) => content,
}: SpellCardFaceProps) => {
    const content = (
        <div
            data-playing-card
            data-playing-card-id={card.uuid}
            style={style}
            className={clsx("playing-card-face relative rounded bg-[#4a1e5f]", className)}
            onClick={onClick}
            onPointerDown={onPointerDown}
        >
            <div className="relative playing-card-face__image-area">
                <div className="cost">{card.cost}</div>
                <Image
                    className="rounded-t h-full w-full object-cover"
                    src={card.imageUrl}
                    alt="Galaguerre spell"
                    draggable={false}
                />
            </div>
            <div className="flex flex-col playing-card-face__body justify-center">
                <p className="text-center text-white m-0 text-xs px-1">{card.label}</p>
            </div>
        </div>
    );

    return <>{wrapper(content)}</>;
};
