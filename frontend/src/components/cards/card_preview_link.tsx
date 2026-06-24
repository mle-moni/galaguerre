import type { PlayerCard } from "#api_types/game.types";
import { type MouseEvent, type ReactNode, useState } from "react";
import { useIsMobilePortrait } from "~/hooks/use_is_mobile_portrait";
import { CardHoverPreview } from "./card_hover_preview.jsx";
import { CardPreviewSheet } from "./card_preview_sheet.jsx";
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
                <CardPreviewSheet
                    card={card}
                    spellPower={spellPower}
                    opened={sheetOpened}
                    onClose={() => setSheetOpened(false)}
                />
            </>
        );
    }

    return (
        <CardHoverPreview card={card} spellPower={spellPower}>
            <span className="card-preview-link">{children}</span>
        </CardHoverPreview>
    );
};
