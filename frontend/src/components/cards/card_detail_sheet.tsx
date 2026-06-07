import type { PlayerCard } from "#api_types/game.types";
import { Drawer } from "@mantine/core";
import { CardDetailContent } from "./card_detail_content.jsx";

interface CardDetailSheetProps {
    card: PlayerCard;
    spellPower?: number;
    opened: boolean;
    onClose: () => void;
}

export const CardDetailSheet = ({
    card,
    spellPower = 0,
    opened,
    onClose,
}: CardDetailSheetProps) => {
    return (
        <Drawer
            opened={opened}
            onClose={onClose}
            position="bottom"
            size="40vh"
            title={card.label}
            withinPortal
            classNames={{ content: "card-detail-sheet-content" }}
        >
            <CardDetailContent card={card} spellPower={spellPower} />
        </Drawer>
    );
};
