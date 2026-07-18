import type { ApiCatalogCard } from "#api_types/deck.types";
import type { PlayerCard } from "#api_types/game.types";
import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";
import { CardArtwork } from "./card_artwork.jsx";
import { PlayerCardFace, type CardFaceSize } from "./player_card_face.jsx";
import "./catalog_card_display.css";

export const catalogCardToPlayerCard = (
    card: ApiCatalogCard,
    options?: { isGolden?: boolean },
): PlayerCard => {
    const base = {
        uuid: `catalog-${card.id}`,
        cardId: card.id,
        label: card.label,
        imageUrl: card.imageUrl,
        goldenVideoUrl: card.goldenVideoUrl,
        isGolden: options?.isGolden ?? false,
        baseCost: card.cost,
        cost: card.cost,
        dynamicCost: card.dynamicCost,
        tags: card.tags,
        rarity: card.rarity,
        labelTags: [] as PlayerCard["labelTags"],
    };

    if (card.type === "MINION") {
        const { id, cardSetId, minionPowers, ...minionFields } = card;
        return {
            ...base,
            ...minionFields,
            type: "MINION" as const,
            attackActions: card.attackActions ?? [],
            minionPowers: minionPowers ?? {
                hasTaunt: false,
                hasCharge: false,
                hasRush: false,
                hasWindfury: false,
                isPoisonous: false,
                hasStealth: false,
                hasDivineShield: false,
            },
        };
    }
    if (card.type === "SPELL") {
        return { ...base, ...card, type: "SPELL" as const };
    }
    return { ...base, ...card, type: "WEAPON" as const };
};

interface CatalogCardDisplayProps {
    card: ApiCatalogCard;
    variant?: "face" | "artwork";
    size?: CardFaceSize;
    className?: string;
    style?: CSSProperties;
    onClick?: () => void;
    overlay?: React.ReactNode;
    copyCount?: number;
    isGolden?: boolean;
}

export const CatalogCardDisplay = ({
    card,
    variant = "face",
    size,
    className,
    style,
    onClick,
    overlay,
    copyCount,
    isGolden = false,
}: CatalogCardDisplayProps) => {
    if (variant === "artwork") {
        return (
            <div
                onClick={onClick}
                className={clsx("catalog-card-artwork", onClick && "cursor-pointer", className)}
                style={style}
            >
                <CardArtwork
                    imageUrl={card.imageUrl}
                    goldenVideoUrl={card.goldenVideoUrl}
                    isGolden={isGolden}
                    alt={card.label}
                    imageLoading="lazy"
                />
                {overlay}
            </div>
        );
    }

    const playerCard = catalogCardToPlayerCard(card, { isGolden });

    const wrapper = (content: ReactNode) => (
        <div className="relative">
            {content}
            {overlay}
        </div>
    );

    return (
        <div onClick={onClick} className={clsx(onClick && "cursor-pointer")}>
            <PlayerCardFace
                card={playerCard}
                size={size}
                attack={card.type === "MINION" ? card.attack : undefined}
                health={card.type === "MINION" ? card.health : undefined}
                style={style}
                className={className}
                wrapper={wrapper}
                imageLoading="lazy"
                copyCount={copyCount}
            />
        </div>
    );
};
