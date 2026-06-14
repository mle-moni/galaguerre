import type { PlayerCard } from "#api_types/game.types";
import { type MouseEvent, type ReactNode, useState } from "react";
import { CardDetailPopover } from "./card_detail_popover.jsx";
import { CardDetailSheet } from "./card_detail_sheet.jsx";
import { useIsMobilePortrait } from "~/hooks/use_is_mobile_portrait";
import "./card_preview_link.css";

interface CardPreviewLinkProps {
    card: PlayerCard;
    children: ReactNode;
    spellPower?: number;
}

export const CardPreviewLink = ({ card, children, spellPower = 0 }: CardPreviewLinkProps) => {
    const isMobilePortrait = useIsMobilePortrait();
    const [sheetOpened, setSheetOpened] = useState(false);

    if (isMobilePortrait) {
        return (
            <>
                <button
                    type="button"
                    className="card-preview-link"
                    onClick={(event: MouseEvent<HTMLButtonElement>) => {
                        event.stopPropagation();
                        setSheetOpened(true);
                    }}
                >
                    {children}
                </button>
                <CardDetailSheet
                    card={card}
                    spellPower={spellPower}
                    opened={sheetOpened}
                    onClose={() => setSheetOpened(false)}
                />
            </>
        );
    }

    return (
        <CardDetailPopover card={card} spellPower={spellPower}>
            <span className="card-preview-link">{children}</span>
        </CardDetailPopover>
    );
};
