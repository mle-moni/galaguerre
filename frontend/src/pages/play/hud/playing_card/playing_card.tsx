import "./playing_card.css";

import type { PlayerCard } from "#api_types/game.types";

import clsx from "clsx";
import { observer } from "mobx-react-lite";
import type { CSSProperties } from "react";
import { useGameContext } from "~/hooks/use_game_state";
import { CardDetailHover } from "./card_detail_hover.jsx";
import { MinionCardFace } from "./minion_card_face.jsx";

interface CardProps {
    card: PlayerCard;
    isOpponent?: boolean;
    style?: CSSProperties;
}

export const PlayingCard = observer(({ card, isOpponent, style }: CardProps) => {
    const { store } = useGameContext();
    if (card.type !== "MINION") return <p>Card type {card.type} not supported</p>;

    if (isOpponent) {
        return (
            <div
                style={style}
                className={clsx("w-[120px] h-[150px] rounded bg-[#1e3a5f] cursor-pointer")}
            />
        );
    }

    return (
        <MinionCardFace
            card={card}
            attack={card.attack}
            health={card.health}
            style={style}
            className="cursor-pointer"
            draggable={store.isMyTurn}
            onDragStart={() => store.cardDragStore.setCardDragged(card)}
            onDragEnd={() => store.cardDragStore.setCardDragged(null)}
            wrapper={(content) => <CardDetailHover card={card}>{content}</CardDetailHover>}
        />
    );
});
