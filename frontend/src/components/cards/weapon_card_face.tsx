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
            className={clsx("relative w-[120px] h-[150px] rounded bg-[#5f3a1e]", className)}
            onClick={onClick}
        >
            <div className="relative">
                <div className="cost">{card.cost}</div>
                <Image
                    className="rounded-t"
                    src={card.imageUrl}
                    height={75}
                    alt="Galaguerre weapon"
                    draggable={false}
                />
            </div>
            <div className="flex flex-col h-[75px] justify-around">
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
