import { playerHasBoardSpace } from "#api_types/board";
import type { PlayerCard } from "#api_types/game.types";

import clsx from "clsx";
import { observer } from "mobx-react-lite";
import type { CSSProperties } from "react";
import { MinionCardFace } from "~/components/cards/minion_card_face";
import { SpellCardFace } from "~/components/cards/spell_card_face";
import { WeaponCardFace } from "~/components/cards/weapon_card_face";
import { useGameContext } from "~/hooks/use_game_state";
import { notifyError } from "~/services/toasts";
import { CardDetailHover } from "./card_detail_hover.jsx";
import "./playing_card.css";

interface CardProps {
    card: PlayerCard;
    isOpponent?: boolean;
    style?: CSSProperties;
    showDetailButton?: boolean;
}

export const PlayingCard = observer(({ card, isOpponent, style, showDetailButton }: CardProps) => {
    const { store } = useGameContext();

    if (isOpponent) {
        return (
            <div
                data-playing-card
                data-playing-card-id={card.uuid}
                style={style}
                className={clsx("playing-card-face rounded bg-[#1e3a5f] cursor-pointer")}
            />
        );
    }

    const canPlay =
        store.isMyTurn &&
        card.cost <= store.me.mana &&
        (card.type !== "MINION" || playerHasBoardSpace(store.me)) &&
        (card.type === "SPELL" || card.type === "MINION"
            ? !store.targetSelectionStore.requiresTarget(card) ||
              store.targetSelectionStore.hasPlayableTarget(card)
            : true);
    const isArmed =
        (card.type === "SPELL" || card.type === "WEAPON") &&
        store.targetSelectionStore.isCardArmed(card);
    const isMinionHinted =
        card.type === "MINION" && store.cardDragStore.minionPlayHintCardId === card.uuid;
    const cardClassName = clsx(
        canPlay ? "cursor-pointer" : "cursor-not-allowed opacity-60",
        (isArmed || isMinionHinted) && "playing-card--armed",
    );

    const handleUnplayableCardClick = () => {
        if (card.cost > store.me.mana) {
            notifyError("Vous n'avez pas assez de mana pour jouer cette carte");
            return;
        }

        if (card.type === "MINION" && !playerHasBoardSpace(store.me)) {
            notifyError("Votre plateau est plein (7 serviteurs maximum)");
        }
    };

    const handlePlayableCardClick = () => {
        if (!canPlay) {
            handleUnplayableCardClick();
            return;
        }

        if (card.type !== "SPELL" && card.type !== "WEAPON") return;

        store.targetSelectionStore.handlePlayableCardClick(card);
    };

    const handleMinionClick = () => {
        if (!canPlay) {
            handleUnplayableCardClick();
            return;
        }

        store.cardDragStore.showMinionPlayHint(card.uuid);
    };

    const handleTargetedSpellPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!canPlay) {
            handleUnplayableCardClick();
            return;
        }

        if (card.type !== "SPELL" || !store.targetSelectionStore.requiresTarget(card)) return;
        if (!store.targetSelectionStore.isCardArmed(card)) return;

        event.preventDefault();

        const rect = event.currentTarget.getBoundingClientRect();
        const arrowOrigin = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
        };

        store.targetSelectionStore.beginPendingSpellDrag(
            card,
            { x: event.clientX, y: event.clientY },
            arrowOrigin,
        );
    };

    if (card.type === "WEAPON") {
        return (
            <WeaponCardFace
                card={card}
                style={style}
                className={cardClassName}
                onClick={handlePlayableCardClick}
                wrapper={(content) => (
                    <CardDetailHover card={card} showDetailButton={showDetailButton}>
                        {content}
                    </CardDetailHover>
                )}
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
                onClick={handlePlayableCardClick}
                onPointerDown={isTargeted && isArmed ? handleTargetedSpellPointerDown : undefined}
                wrapper={(content) => (
                    <CardDetailHover card={card} showDetailButton={showDetailButton}>
                        {content}
                    </CardDetailHover>
                )}
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
            onClick={handleMinionClick}
            onDragStart={() => store.cardDragStore.setCardDragged(card)}
            onDragEnd={() => store.cardDragStore.setCardDragged(null)}
            wrapper={(content) => (
                <CardDetailHover card={card} showDetailButton={showDetailButton}>
                    {content}
                </CardDetailHover>
            )}
        />
    );
});
