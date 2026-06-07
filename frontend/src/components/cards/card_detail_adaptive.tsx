import type { PlayerCard } from "#api_types/game.types";
import { type MouseEvent, type ReactNode, useState } from "react";
import { CardDetailPopover } from "./card_detail_popover.jsx";
import { CardDetailSheet } from "./card_detail_sheet.jsx";
import { useIsNarrowScreen } from "~/hooks/use_is_narrow_screen";

interface CardDetailAdaptiveProps {
    card: PlayerCard;
    children: ReactNode;
    spellPower?: number;
    showDetailButton?: boolean;
}

export const CardDetailAdaptive = ({
    card,
    children,
    spellPower = 0,
    showDetailButton = true,
}: CardDetailAdaptiveProps) => {
    const isNarrowScreen = useIsNarrowScreen();
    const [sheetOpened, setSheetOpened] = useState(false);

    if (!isNarrowScreen) {
        return (
            <CardDetailPopover card={card} spellPower={spellPower}>
                {children}
            </CardDetailPopover>
        );
    }

    const handleInfoClick = (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        setSheetOpened(true);
    };

    return (
        <>
            <div className="relative">
                {children}
                {showDetailButton && (
                    <button
                        type="button"
                        className="card-detail-info-button"
                        aria-label={`Détails de ${card.label}`}
                        onClick={handleInfoClick}
                    >
                        i
                    </button>
                )}
            </div>
            <CardDetailSheet
                card={card}
                spellPower={spellPower}
                opened={sheetOpened}
                onClose={() => setSheetOpened(false)}
            />
        </>
    );
};
