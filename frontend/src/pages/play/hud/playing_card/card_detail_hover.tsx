import type { PlayerCard } from "#api_types/game.types";
import { observer } from "mobx-react-lite";
import { type MouseEvent, type ReactNode, useState } from "react";
import { CardDetailPopover } from "~/components/cards/card_detail_popover";
import { CardDetailSheet } from "~/components/cards/card_detail_sheet";
import { useGameContext } from "~/hooks/use_game_state";
import { useIsMobilePortrait } from "~/hooks/use_is_mobile_portrait";
import "~/pages/play/hud/mobile/mobile.css";

interface CardDetailHoverProps {
    card: PlayerCard;
    children: ReactNode;
    showDetailButton?: boolean;
}

export const CardDetailHover = observer(
    ({ card, children, showDetailButton = false }: CardDetailHoverProps) => {
        const { store } = useGameContext();
        const isMobilePortrait = useIsMobilePortrait();
        const [sheetOpened, setSheetOpened] = useState(false);

        const shouldShowInfoButton = isMobilePortrait && showDetailButton;

        if (!isMobilePortrait) {
            return (
                <CardDetailPopover card={card} spellPower={store.me.spellPower}>
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
                    {shouldShowInfoButton && (
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
                    spellPower={store.me.spellPower}
                    opened={sheetOpened}
                    onClose={() => setSheetOpened(false)}
                />
            </>
        );
    },
);
