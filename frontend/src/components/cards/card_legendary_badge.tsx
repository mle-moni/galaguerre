import { CARD_RARITY_LABELS, LEGENDARY_CARD_TOOLTIP } from "#api_types/card_rarity.types";
import { Tooltip } from "@mantine/core";
import clsx from "clsx";
import "./card_faces.css";

interface CardLegendaryBadgeProps {
    className?: string;
}

export const CardLegendaryBadge = ({ className }: CardLegendaryBadgeProps) => (
    <Tooltip label={LEGENDARY_CARD_TOOLTIP} withArrow multiline w={220}>
        <span className={clsx("card-legendary-badge", className)}>
            {CARD_RARITY_LABELS.LEGENDARY}
        </span>
    </Tooltip>
);
