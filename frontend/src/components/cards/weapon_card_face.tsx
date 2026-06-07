import "./card_faces.css";

import type { WeaponCard } from "#api_types/game.types";
import { Image } from "@mantine/core";
import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";

interface WeaponCardFaceProps {
    card: WeaponCard;
    className?: string;
    style?: CSSProperties;
    onClick?: () => void;
    wrapper?: (content: ReactNode) => ReactNode;
}

export const WeaponCardFace = ({
    card,
    className,
    style,
    onClick,
    wrapper = (content) => content,
}: WeaponCardFaceProps) => {
    const content = (
        <div
            data-playing-card
            data-playing-card-id={card.uuid}
            style={style}
            className={clsx("playing-card-face relative rounded bg-[#5f3a1e]", className)}
            onClick={onClick}
        >
            <div className="relative playing-card-face__image-area">
                <div className="cost">{card.cost}</div>
                <Image
                    className="rounded-t h-full w-full object-cover"
                    src={card.imageUrl}
                    alt="Galaguerre weapon"
                    draggable={false}
                />
            </div>
            <div className="flex flex-col playing-card-face__body justify-around">
                <p className="text-center text-white m-0 text-xs px-1">{card.label}</p>
                <div className="flex justify-between mx-1">
                    <div className="attack">{card.damage}</div>
                    <div className="durability">{card.durability}</div>
                </div>
            </div>
        </div>
    );

    return <>{wrapper(content)}</>;
};
