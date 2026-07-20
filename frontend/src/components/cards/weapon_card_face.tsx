import "./card_faces.css";

import type { WeaponCard } from "#api_types/game.types";
import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";
import { CardArtwork } from "./card_artwork.jsx";
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
    draggable?: boolean;
    onDragStart?: () => void;
    onDragEnd?: () => void;
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
    draggable,
    onDragStart,
    onDragEnd,
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
            draggable={draggable}
            onClick={onClick}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
        >
            <div className="relative playing-card-face__image-area">
                <div className={clsx("cost", card.cost < card.baseCost && "cost--reduced")}>
                    {card.cost}
                </div>
                <CardArtwork
                    className="rounded-t"
                    imageUrl={card.imageUrl}
                    goldenVideoUrl={card.goldenVideoUrl}
                    isGolden={card.isGolden}
                    alt="Galaguerre weapon"
                    imageLoading={imageLoading}
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
