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
import { WeaponCardFace } from "./weapon_card_face.jsx";

interface CardProps {
    card: PlayerCard;
    isOpponent?: boolean;
    style?: CSSProperties;
}

export const PlayingCard = observer(({ card, isOpponent, style }: CardProps) => {
    const { store } = useGameContext();

    if (isOpponent) {
        return (
            <div
                style={style}
                className={clsx("w-[120px] h-[150px] rounded bg-[#1e3a5f] cursor-pointer")}
            />
        );
    }

    const canPlay = store.isMyTurn && card.cost <= store.me.mana;
    const cardClassName = clsx(canPlay ? "cursor-pointer" : "cursor-not-allowed opacity-60");

    const handleSpellClick = () => {
        if (!canPlay) {
            if (card.cost > store.me.mana) {
                notifyError("Vous n'avez pas assez de mana pour jouer cette carte");
            }
            return;
        }

        if (card.type === "SPELL" && store.targetSelectionStore.requiresTarget(card)) {
            store.targetSelectionStore.startSpellTargetSelection(card);
            return;
        }

        if (card.type === "SPELL" || card.type === "WEAPON") {
            emitSocketEventToServer("game:play_card", {
                cardId: card.uuid,
                spotId: null,
                owner: "PLAYER",
            });
        }
    };

    if (card.type === "WEAPON") {
        return (
            <WeaponCardFace
                card={card}
                style={style}
                className={cardClassName}
                onClick={handleSpellClick}
                wrapper={(content) => <CardDetailHover card={card}>{content}</CardDetailHover>}
            />
        );
    }

    if (card.type === "SPELL") {
        return (
            <SpellCardFace
                card={card}
                style={style}
                className={cardClassName}
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
            className={cardClassName}
            draggable={canPlay}
            onDragStart={() => store.cardDragStore.setCardDragged(card)}
            onDragEnd={() => store.cardDragStore.setCardDragged(null)}
            wrapper={(content) => <CardDetailHover card={card}>{content}</CardDetailHover>}
        />
    );
});
