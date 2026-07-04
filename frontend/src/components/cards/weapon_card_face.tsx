import "./card_faces.css";

import type { WeaponCard } from "#api_types/game.types";
import { Image } from "@mantine/core";
import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";
import { CardCopyCountBadge } from "./card_copy_count_badge.jsx";
import { CardFaceLabel } from "./card_face_label.jsx";
import { CardFaceDescription } from "./card_face_description.jsx";
import { CardFaceTypeLabel } from "./card_face_type_label.jsx";
import { CardRarityBadge } from "./card_legendary_badge.jsx";

interface WeaponCardFaceProps {
    card: WeaponCard;
    className?: string;
    style?: CSSProperties;
    spellPower?: number;
    onClick?: () => void;
    wrapper?: (content: ReactNode) => ReactNode;
    imageLoading?: "eager" | "lazy";
    copyCount?: number;
}

export const WeaponCardFace = ({
    card,
    className,
    style,
    spellPower = 0,
    onClick,
    wrapper = (content) => content,
    imageLoading,
    copyCount,
}: WeaponCardFaceProps) => {
    const content = (
        <div
            data-playing-card
            data-playing-card-id={card.uuid}
            style={style}
            className={clsx("weapon-card-face playing-card-face relative", className)}
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
                    loading={imageLoading}
                />
            </div>
            <div className="playing-card-face__body">
                <div className="playing-card-face__text">
                    {card.rarity !== "COMMON" && <CardRarityBadge rarity={card.rarity} />}
                    <CardFaceLabel label={card.label} />
                    <CardFaceTypeLabel type="WEAPON" />
                    <CardFaceDescription card={card} spellPower={spellPower} />
                </div>
            </div>
            <div className="playing-card-face__stats">
                <div className="attack">{card.damage}</div>
                <div className="durability">{card.durability}</div>
            </div>
            {copyCount !== undefined && <CardCopyCountBadge count={copyCount} />}
        </div>
    );

    return <>{wrapper(content)}</>;
};
