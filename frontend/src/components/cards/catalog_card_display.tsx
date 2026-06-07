import type { ApiCatalogCard } from "#api_types/deck.types";
import type { MinionCard, PlayerCard, SpellCard, WeaponCard } from "#api_types/game.types";
import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";
import { CardDetailPopover } from "./card_detail_popover.jsx";
import { MinionCardFace } from "./minion_card_face.jsx";
import { SpellCardFace } from "./spell_card_face.jsx";
import { WeaponCardFace } from "./weapon_card_face.jsx";

const toPlayerCard = (card: ApiCatalogCard): PlayerCard => {
    const base = {
        uuid: `catalog-${card.id}`,
        cardId: card.id,
        label: card.label,
        imageUrl: card.imageUrl,
        cost: card.cost,
        tagIds: card.tagIds,
    };

    if (card.type === "MINION") {
        return { ...base, ...card, type: "MINION" as const };
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
    showDetailOnHover?: boolean;
}

export const CatalogCardDisplay = ({
    card,
    className,
    style,
    onClick,
    overlay,
    showDetailOnHover = false,
}: CatalogCardDisplayProps) => {
    const playerCard = toPlayerCard(card);

    const wrapper = (content: ReactNode) => {
        const inner = (
            <div className="relative">
                {content}
                {overlay}
            </div>
        );

        if (!showDetailOnHover) return inner;

        return <CardDetailPopover card={playerCard}>{inner}</CardDetailPopover>;
    };

    if (card.type === "WEAPON") {
        return (
            <WeaponCardFace
                card={playerCard as WeaponCard}
                style={style}
                className={clsx(className, onClick && "cursor-pointer")}
                onClick={onClick}
                wrapper={wrapper}
            />
        );
    }

    if (card.type === "SPELL") {
        return (
            <SpellCardFace
                card={playerCard as SpellCard}
                style={style}
                className={clsx(className, onClick && "cursor-pointer")}
                onClick={onClick}
                wrapper={wrapper}
            />
        );
    }

    return (
        <div onClick={onClick} className={clsx(onClick && "cursor-pointer")}>
            <MinionCardFace
                card={playerCard as MinionCard}
                attack={card.attack}
                health={card.health}
                style={style}
                className={className}
                wrapper={wrapper}
            />
        </div>
    );
};
