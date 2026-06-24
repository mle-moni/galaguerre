import type { ApiCatalogCard } from "#api_types/deck.types";
import type { PlayerCard } from "#api_types/game.types";
import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";
import { PlayerCardFace } from "./player_card_face.jsx";

const toPlayerCard = (card: ApiCatalogCard): PlayerCard => {
    const base = {
        uuid: `catalog-${card.id}`,
        cardId: card.id,
        label: card.label,
        imageUrl: card.imageUrl,
        baseCost: card.cost,
        cost: card.cost,
        dynamicCost: null,
        tags: card.tags,
    };

    if (card.type === "MINION") {
        const { id, cardSetId, minionPowers, ...minionFields } = card;
        return {
            ...base,
            ...minionFields,
            type: "MINION" as const,
            minionPowers: minionPowers ?? {
                hasTaunt: false,
                hasCharge: false,
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
    className?: string;
    style?: CSSProperties;
    onClick?: () => void;
    overlay?: React.ReactNode;
}

export const CatalogCardDisplay = ({
    card,
    className,
    style,
    onClick,
    overlay,
}: CatalogCardDisplayProps) => {
    const playerCard = toPlayerCard(card);

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
                attack={card.type === "MINION" ? card.attack : undefined}
                health={card.type === "MINION" ? card.health : undefined}
                style={style}
                className={className}
                wrapper={wrapper}
            />
        </div>
    );
};
