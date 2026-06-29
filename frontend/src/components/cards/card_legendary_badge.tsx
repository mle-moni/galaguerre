import type { CardRarity } from "#api_types/card_rarity.types";
import { CARD_RARITY_LABELS, LEGENDARY_CARD_TOOLTIP } from "#api_types/card_rarity.types";
import { Tooltip } from "@mantine/core";
import clsx from "clsx";
import "./card_faces.css";

interface CardRarityBadgeProps {
    rarity: Exclude<CardRarity, "COMMON">;
    className?: string;
}

const RARITY_BADGE_CLASS: Record<Exclude<CardRarity, "COMMON">, string> = {
    LEGENDARY: "card-rarity-badge--legendary",
    EPIC: "card-rarity-badge--epic",
    RARE: "card-rarity-badge--rare",
};

export const CardRarityBadge = ({ rarity, className }: CardRarityBadgeProps) => {
    const badge = (
        <span className={clsx("card-rarity-badge", RARITY_BADGE_CLASS[rarity], className)}>
            {CARD_RARITY_LABELS[rarity]}
        </span>
    );

    if (rarity === "LEGENDARY") {
        return (
            <Tooltip label={LEGENDARY_CARD_TOOLTIP} withArrow multiline w={220}>
                {badge}
            </Tooltip>
        );
    }

    return badge;
};

interface CardLegendaryBadgeProps {
    className?: string;
}

export const CardLegendaryBadge = ({ className }: CardLegendaryBadgeProps) => (
    <CardRarityBadge rarity="LEGENDARY" className={className} />
);
