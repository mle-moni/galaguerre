import type { PlayerCard } from "#api_types/game.types";
import { Drawer } from "@mantine/core";
import { PlayerCardFace } from "./player_card_face.jsx";

interface CardDetailSheetProps {
    card: PlayerCard;
    spellPower?: number;
    opened: boolean;
    onClose: () => void;
    isSilenced?: boolean;
    attack?: number;
    health?: number;
}

export const CardDetailSheet = ({
    card,
    spellPower = 0,
    opened,
    onClose,
    isSilenced,
    attack,
    health,
}: CardDetailSheetProps) => {
    return (
        <Drawer
            opened={opened}
            onClose={onClose}
            position="bottom"
            size="92dvh"
            title={card.label}
            withinPortal
            classNames={{
                content: "card-preview-sheet-content",
                body: "card-preview-sheet-body",
            }}
        >
            <div className="card-preview-sheet__face">
                <PlayerCardFace
                    card={card}
                    size="full"
                    spellPower={spellPower}
                    isSilenced={isSilenced}
                    attack={attack}
                    health={health}
                />
            </div>
        </Drawer>
    );
};
