import type { PlayerCard } from "#api_types/game.types";
import { HoverCard } from "@mantine/core";
import type { ReactNode } from "react";
import { CardDetailContent } from "./card_detail_content.jsx";

interface CardDetailPopoverProps {
    card: PlayerCard;
    children: ReactNode;
    spellPower?: number;
    disabled?: boolean;
    disablePointerEvents?: boolean;
    isSilenced?: boolean;
}

export const CardDetailPopover = ({
    card,
    children,
    spellPower = 0,
    disabled = false,
    disablePointerEvents = false,
    isSilenced,
}: CardDetailPopoverProps) => {
    return (
        <HoverCard
            width={300}
            shadow="md"
            openDelay={250}
            position="top"
            withinPortal
            disabled={disabled}
        >
            <HoverCard.Target>{children}</HoverCard.Target>
            <HoverCard.Dropdown style={{ pointerEvents: disablePointerEvents ? "none" : "auto" }}>
                <CardDetailContent card={card} spellPower={spellPower} isSilenced={isSilenced} />
            </HoverCard.Dropdown>
        </HoverCard>
    );
};
