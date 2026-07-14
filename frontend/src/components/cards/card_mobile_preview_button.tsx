import { type MouseEvent, type ReactNode, useState } from "react";
import { useIsMobilePortrait } from "~/hooks/use_is_mobile_portrait";
import type { MinionState, PlayerCard } from "#api_types/game.types";
import { CardPreviewSheet } from "./card_preview_sheet.jsx";
import "~/style/card_sizing.css";

interface CardMobilePreviewButtonProps {
    card: PlayerCard;
    children: ReactNode;
    spellPower?: number;
    isSilenced?: boolean;
    showDetailButton?: boolean;
    attack?: number;
    health?: number;
    minionState?: MinionState;
}

export const CardMobilePreviewButton = ({
    card,
    children,
    spellPower = 0,
    isSilenced,
    showDetailButton = false,
    attack,
    health,
    minionState,
}: CardMobilePreviewButtonProps) => {
    const isMobilePortrait = useIsMobilePortrait();
    const [sheetOpened, setSheetOpened] = useState(false);

    if (!isMobilePortrait || !showDetailButton) {
        return <>{children}</>;
    }

    const handleInfoClick = (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        setSheetOpened(true);
    };

    return (
        <>
            <div className="relative">
                {children}
                <button
                    type="button"
                    className="card-detail-info-button"
                    aria-label={`Détails de ${card.label}`}
                    onClick={handleInfoClick}
                >
                    i
                </button>
            </div>
            <CardPreviewSheet
                card={card}
                spellPower={spellPower}
                opened={sheetOpened}
                onClose={() => setSheetOpened(false)}
                isSilenced={isSilenced}
                attack={attack}
                health={health}
                minionState={minionState}
            />
        </>
    );
};
