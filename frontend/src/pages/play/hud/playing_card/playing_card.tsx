import type { PlayerCard } from "#api_types/game.types";

import clsx from "clsx";
import { observer } from "mobx-react-lite";
import type { CSSProperties } from "react";
import { MinionCardFace } from "~/components/cards/minion_card_face";
import { SpellCardFace } from "~/components/cards/spell_card_face";
import { WeaponCardFace } from "~/components/cards/weapon_card_face";
import { useGameContext } from "~/hooks/use_game_state";
import { notifyError } from "~/services/toasts";
import { emitSocketEventToServer } from "~/services/ws_client";
import { CardDetailHover } from "./card_detail_hover.jsx";

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

    const handleTargetedSpellPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!canPlay) {
            if (card.cost > store.me.mana) {
                notifyError("Vous n'avez pas assez de mana pour jouer cette carte");
            }
            return;
        }

        if (card.type !== "SPELL" || !store.targetSelectionStore.requiresTarget(card)) return;

        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);

        const rect = event.currentTarget.getBoundingClientRect();
        const origin = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
        };

        store.targetSelectionStore.startSpellTargetSelection(card);
        store.targetingArrowStore.beginDrag(origin, { x: event.clientX, y: event.clientY });
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
        const isTargeted = store.targetSelectionStore.requiresTarget(card);

        return (
            <SpellCardFace
                card={card}
                style={style}
                className={cardClassName}
                onClick={isTargeted ? undefined : handleSpellClick}
                onPointerDown={isTargeted ? handleTargetedSpellPointerDown : undefined}
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
