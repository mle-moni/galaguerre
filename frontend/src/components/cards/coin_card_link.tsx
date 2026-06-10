import { COIN_CARD_PREVIEW } from "#api_types/coin";
import { type MouseEvent, type ReactNode, useState } from "react";
import { CardDetailPopover } from "./card_detail_popover.jsx";
import { CardDetailSheet } from "./card_detail_sheet.jsx";
import { useIsMobilePortrait } from "~/hooks/use_is_mobile_portrait";
import "./coin_card_link.css";

interface CoinCardLinkProps {
    children: ReactNode;
}

export const CoinCardLink = ({ children }: CoinCardLinkProps) => {
    const isMobilePortrait = useIsMobilePortrait();
    const [sheetOpened, setSheetOpened] = useState(false);

    if (isMobilePortrait) {
        return (
            <>
                <button
                    type="button"
                    className="coin-card-link"
                    onClick={(event: MouseEvent<HTMLButtonElement>) => {
                        event.stopPropagation();
                        setSheetOpened(true);
                    }}
                >
                    {children}
                </button>
                <CardDetailSheet
                    card={COIN_CARD_PREVIEW}
                    opened={sheetOpened}
                    onClose={() => setSheetOpened(false)}
                />
            </>
        );
    }

    return (
        <CardDetailPopover card={COIN_CARD_PREVIEW}>
            <span className="coin-card-link">{children}</span>
        </CardDetailPopover>
    );
};
