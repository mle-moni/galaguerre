import { playerHasBoardSpace } from "#api_types/board";
import type { PlayerCard } from "#api_types/game.types";

import clsx from "clsx";
import { observer } from "mobx-react-lite";
import type { CSSProperties } from "react";
import { CardBackFace } from "~/components/cards/card_back_face";
import { CardHoverPreview } from "~/components/cards/card_hover_preview";
import { CardMobilePreviewButton } from "~/components/cards/card_mobile_preview_button";
import { PlayerCardFace } from "~/components/cards/player_card_face";
import { useGameContext } from "~/hooks/use_game_state";
import { useIsMobilePortrait } from "~/hooks/use_is_mobile_portrait";
import { notifyError } from "~/services/toasts";
import "./playing_card.css";

interface CardProps {
    card: PlayerCard;
    isOpponent?: boolean;
    style?: CSSProperties;
    showDetailButton?: boolean;
}

export const PlayingCard = observer(({ card, isOpponent, style, showDetailButton }: CardProps) => {
    const { store } = useGameContext();
    const isMobilePortrait = useIsMobilePortrait();

    if (isOpponent) {
        return <CardBackFace cardUuid={card.uuid} style={style} className="cursor-pointer" />;
    }

    const canPlay =
        store.isMyTurn &&
        card.cost <= store.me.mana &&
        (card.type !== "MINION" || playerHasBoardSpace(store.me)) &&
        (card.type === "SPELL"
            ? !store.targetSelectionStore.requiresTarget(card) ||
              store.targetSelectionStore.hasPlayableTarget(card)
            : true);
    const isArmed =
        (card.type === "SPELL" || card.type === "WEAPON") &&
        store.targetSelectionStore.isCardArmed(card);
    const isMinionHinted =
        card.type === "MINION" && store.cardDragStore.minionPlayHintCardId === card.uuid;
    const isCardQueued =
        card.type === "MINION" && store.combatActionQueue.isCardReserved(card.uuid);
    const cardClassName = clsx(
        canPlay && !isCardQueued ? "cursor-pointer" : "cursor-not-allowed opacity-60",
        (isArmed || isMinionHinted || isCardQueued) && "playing-card--armed",
    );

    const handleUnplayableCardClick = () => {
        if (card.cost > store.me.mana) {
            notifyError("Vous n'avez pas assez de mana pour jouer cette carte");
            return;
        }

        if (card.type === "MINION" && !playerHasBoardSpace(store.me)) {
            notifyError("Votre plateau est plein (7 monstres maximum)");
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
        if (isCardQueued) return;

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

    const wrapper = (content: React.ReactNode) => {
        const attack = card.type === "MINION" ? card.attack : undefined;
        const health = card.type === "MINION" ? card.health : undefined;

        if (isMobilePortrait) {
            return (
                <CardMobilePreviewButton
                    card={card}
                    spellPower={store.me.spellPower}
                    showDetailButton={showDetailButton}
                    attack={attack}
                    health={health}
                >
                    {content}
                </CardMobilePreviewButton>
            );
        }

        return (
            <CardHoverPreview
                card={card}
                spellPower={store.me.spellPower}
                disabled={store.isCardHoverPreviewDisabled}
                attack={attack}
                health={health}
            >
                {content}
            </CardHoverPreview>
        );
    };

    if (card.type === "WEAPON") {
        return (
            <PlayerCardFace
                card={card}
                style={style}
                className={cardClassName}
                spellPower={store.me.spellPower}
                onClick={handlePlayableCardClick}
                wrapper={wrapper}
            />
        );
    }

    if (card.type === "SPELL") {
        const isTargeted = store.targetSelectionStore.requiresTarget(card);

        return (
            <PlayerCardFace
                card={card}
                style={style}
                className={cardClassName}
                spellPower={store.me.spellPower}
                onClick={isMobilePortrait && isTargeted ? undefined : handlePlayableCardClick}
                onPointerDown={
                    !isMobilePortrait && isTargeted && isArmed
                        ? handleTargetedSpellPointerDown
                        : undefined
                }
                wrapper={wrapper}
            />
        );
    }

    return (
        <PlayerCardFace
            card={card}
            attack={card.attack}
            health={card.health}
            style={style}
            className={cardClassName}
            spellPower={store.me.spellPower}
            draggable={!isMobilePortrait && canPlay && !isCardQueued}
            onClick={handleMinionClick}
            onDragStart={() => store.cardDragStore.setCardDragged(card)}
            onDragEnd={() => store.cardDragStore.setCardDragged(null)}
            wrapper={wrapper}
        />
    );
});
