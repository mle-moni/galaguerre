import type { PlayerCard } from "#api_types/game.types";
import { observer } from "mobx-react-lite";
import type { ReactNode } from "react";
import { CardDetailPopover } from "~/components/cards/card_detail_popover";
import { useGameContext } from "~/hooks/use_game_state";

interface CardDetailHoverProps {
    card: PlayerCard;
    children: ReactNode;
}

export const CardDetailHover = observer(({ card, children }: CardDetailHoverProps) => {
    const { store } = useGameContext();

    return (
        <CardDetailPopover card={card} spellPower={store.me.spellPower}>
            {children}
        </CardDetailPopover>
    );
});
