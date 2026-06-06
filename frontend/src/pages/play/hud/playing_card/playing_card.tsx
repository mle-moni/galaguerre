import "./playing_card.css";

import type { PlayerCard } from "#api_types/game.types";

import clsx from "clsx";
import { observer } from "mobx-react-lite";
import type { CSSProperties } from "react";
import { useGameContext } from "~/hooks/use_game_state";
import { notifyError } from "~/services/toasts";
import { emitSocketEventToServer } from "~/services/ws_client";
import { CardDetailHover } from "./card_detail_hover.jsx";
import { MinionCardFace } from "./minion_card_face.jsx";
import { SpellCardFace } from "./spell_card_face.jsx";

interface CardProps {
    card: PlayerCard;
    isOpponent?: boolean;
    style?: CSSProperties;
}

export const PlayingCard = observer(({ card, isOpponent, style }: CardProps) => {
    const { store } = useGameContext();

    if (card.type === "WEAPON") return <p>Card type {card.type} not supported</p>;

    if (isOpponent) {
        return (
            <div
                style={style}
                className={clsx("w-[120px] h-[150px] rounded bg-[#1e3a5f] cursor-pointer")}
            />
        );
    }

    const handleSpellClick = () => {
        if (!store.isMyTurn) return;
        if (card.cost > store.me.mana) {
            notifyError("Vous n'avez pas assez de mana pour jouer cette carte");
            return;
        }

        if (card.type === "SPELL" && store.targetSelectionStore.requiresTarget(card)) {
            store.targetSelectionStore.startSpellTargetSelection(card);
            return;
        }

        if (card.type === "SPELL") {
            emitSocketEventToServer("game:play_card", {
                cardId: card.uuid,
                spotId: null,
                owner: "PLAYER",
            });
        }
    };

    if (card.type === "SPELL") {
        const canPlay = store.isMyTurn && card.cost <= store.me.mana;

        return (
            <SpellCardFace
                card={card}
                style={style}
                className={clsx(canPlay ? "cursor-pointer" : "cursor-not-allowed opacity-60")}
                onClick={handleSpellClick}
                wrapper={(content) => <CardDetailHover card={card}>{content}</CardDetailHover>}
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
