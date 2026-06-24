import "./card_faces.css";

import type { WeaponCard } from "#api_types/game.types";
import { Image } from "@mantine/core";
import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";
import { CardFaceDescription } from "./card_face_description.jsx";
import { CardLegendaryBadge } from "./card_legendary_badge.jsx";

interface WeaponCardFaceProps {
    card: WeaponCard;
    className?: string;
    style?: CSSProperties;
    spellPower?: number;
    onClick?: () => void;
    wrapper?: (content: ReactNode) => ReactNode;
    showLegendaryBadge?: boolean;
}

export const WeaponCardFace = ({
    card,
    className,
    style,
    spellPower = 0,
    onClick,
    wrapper = (content) => content,
    showLegendaryBadge = false,
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
                <div className={clsx("cost", card.cost < card.baseCost && "cost--reduced")}>
                    {card.cost}
                </div>
                <Image
                    className="rounded-t h-full w-full object-cover"
                    src={card.imageUrl}
                    alt="Galaguerre weapon"
                    draggable={false}
                />
            </div>
            <div className="playing-card-face__body">
                <div className="playing-card-face__text">
                    {showLegendaryBadge && <CardLegendaryBadge />}
                    <p className="playing-card-face__label">{card.label}</p>
                    <CardFaceDescription card={card} spellPower={spellPower} />
                </div>
            </div>
            <div className="playing-card-face__stats">
                <div className="attack">{card.damage}</div>
                <div className="durability">{card.durability}</div>
            </div>
        </div>
    );

    return <>{wrapper(content)}</>;
};
