import "./card_faces.css";

import type { SpellCard } from "#api_types/game.types";
import { Image } from "@mantine/core";
import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";
import { CardCopyCountBadge } from "./card_copy_count_badge.jsx";
import { CardFaceLabel } from "./card_face_label.jsx";
import { CardFaceDescription } from "./card_face_description.jsx";
import { CardFaceTypeLabel } from "./card_face_type_label.jsx";
import { CardRarityBadge } from "./card_legendary_badge.jsx";

interface SpellCardFaceProps {
    card: SpellCard;
    className?: string;
    style?: CSSProperties;
    spellPower?: number;
    onClick?: () => void;
    onPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
    wrapper?: (content: ReactNode) => ReactNode;
    imageLoading?: "eager" | "lazy";
    copyCount?: number;
}

export const SpellCardFace = ({
    card,
    className,
    style,
    spellPower = 0,
    onClick,
    onPointerDown,
    wrapper = (content) => content,
    imageLoading,
    copyCount,
}: SpellCardFaceProps) => {
    const content = (
        <div
            data-playing-card
            data-playing-card-id={card.uuid}
            style={style}
            className={clsx("spell-card-face playing-card-face relative", className)}
            onClick={onClick}
            onPointerDown={onPointerDown}
        >
            <div className="relative playing-card-face__image-area">
                <div className={clsx("cost", card.cost < card.baseCost && "cost--reduced")}>
                    {card.cost}
                </div>
                <Image
                    className="rounded-t h-full w-full object-cover"
                    src={card.imageUrl}
                    alt="Galaguerre spell"
                    draggable={false}
                    loading={imageLoading}
                />
            </div>
            <div className="playing-card-face__body playing-card-face__body--no-stats">
                <div className="playing-card-face__text">
                    {card.rarity !== "COMMON" && <CardRarityBadge rarity={card.rarity} />}
                    <CardFaceLabel label={card.label} />
                    <CardFaceTypeLabel type="SPELL" />
                    <CardFaceDescription card={card} spellPower={spellPower} />
                </div>
            </div>
            {copyCount !== undefined && <CardCopyCountBadge count={copyCount} />}
        </div>
    );

    return <>{wrapper(content)}</>;
};
