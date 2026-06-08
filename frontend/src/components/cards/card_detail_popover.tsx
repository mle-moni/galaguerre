import type { PlayerCard } from "#api_types/game.types";
import { HoverCard } from "@mantine/core";
import type { ReactNode } from "react";
import { CardDetailContent } from "./card_detail_content.jsx";

interface CardDetailPopoverProps {
    card: PlayerCard;
    children: ReactNode;
    spellPower?: number;
    disablePointerEvents?: boolean;
}

export const CardDetailPopover = ({
    card,
    children,
    spellPower = 0,
    disablePointerEvents = false,
}: CardDetailPopoverProps) => {
    return (
        <HoverCard width={300} shadow="md" openDelay={250} position="top" withinPortal>
            <HoverCard.Target>{children}</HoverCard.Target>
            <HoverCard.Dropdown style={{ pointerEvents: disablePointerEvents ? "none" : "auto" }}>
                <CardDetailContent card={card} spellPower={spellPower} />
            </HoverCard.Dropdown>
        </HoverCard>
    );
};
