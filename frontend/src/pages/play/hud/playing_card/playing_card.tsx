import { playerHasBoardSpace } from "#api_types/board";
import type { PlayerCard, SpellCard } from "#api_types/game.types";

import clsx from "clsx";
import { observer } from "mobx-react-lite";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { CardBackFace } from "~/components/cards/card_back_face";
import { CardHoverPreview } from "~/components/cards/card_hover_preview";
import { CardMobilePreviewButton } from "~/components/cards/card_mobile_preview_button";
import { PlayerCardFace } from "~/components/cards/player_card_face";
import { getElementCenter } from "~/helpers/resolve_target_from_point";
import { useDragClickSuppression } from "~/hooks/use_drag_click_suppression";
import { useGameContext } from "~/hooks/use_game_state";
import { useIsMobilePortrait } from "~/hooks/use_is_mobile_portrait";
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
    const dragClickSuppression = useDragClickSuppression();

    if (isOpponent) {
        return <CardBackFace cardUuid={card.uuid} style={style} className="cursor-pointer" />;
    }

    const requiresSpellTarget =
        card.type === "SPELL" && store.targetSelectionStore.requiresTarget(card);
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
    const isSpellOrWeaponHinted =
        (card.type === "SPELL" || card.type === "WEAPON") &&
        store.cardDragStore.spellOrWeaponPlayHintCardId === card.uuid;
    const isCardQueued =
        card.type === "MINION" && store.combatActionQueue.isCardReserved(card.uuid);
    const isHiddenInHand = store.cardDragStore.isCardHiddenInHand(card.uuid);
    const cardClassName = clsx(
        canPlay && !isCardQueued ? "cursor-pointer" : "cursor-not-allowed opacity-60",
        (isArmed || isMinionHinted || isSpellOrWeaponHinted || isCardQueued) &&
            "playing-card--armed",
        isHiddenInHand && "playing-card--hidden-in-hand",
    );

    const handleUnplayableCardClick = () => {
        if (card.cost > store.me.mana) {
            store.showFeedbackHint("Vous n'avez pas assez de mana pour jouer cette carte");
            return;
        }

        if (card.type === "MINION" && !playerHasBoardSpace(store.me)) {
            store.showFeedbackHint("Votre plateau est plein (7 monstres maximum)");
        }
    };

    const handleSpellOrWeaponClick = () => {
        if (dragClickSuppression.consumeClickSuppression()) return;

        if (!canPlay) {
            handleUnplayableCardClick();
            return;
        }

        if (card.type !== "SPELL" && card.type !== "WEAPON") return;
        if (isMobilePortrait) return;
        // Targeted spells are played via pointer → arrow, not click-to-hint.
        if (card.type === "SPELL" && store.targetSelectionStore.requiresTarget(card)) return;

        store.cardDragStore.showSpellOrWeaponPlayHint(card.uuid);
    };

    const handleMinionClick = () => {
        if (isCardQueued) return;

        if (!canPlay) {
            handleUnplayableCardClick();
            return;
        }

        store.cardDragStore.showMinionPlayHint(card.uuid);
    };

    const handleTargetedSpellPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (isMobilePortrait || !canPlay || !requiresSpellTarget) return;
        if (store.isInputBlocked) return;

        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        dragClickSuppression.begin(event);

        const origin = getElementCenter(event.currentTarget);
        store.cardDragStore.startTargetedSpellDrag(card as SpellCard, origin);
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
                draggable={!isMobilePortrait && canPlay}
                onClick={handleSpellOrWeaponClick}
                onDragStart={() => store.cardDragStore.setCardDragged(card)}
                onDragEnd={() => store.cardDragStore.setCardDragged(null)}
                wrapper={wrapper}
            />
        );
    }

    if (card.type === "SPELL") {
        if (requiresSpellTarget) {
            return (
                <PlayerCardFace
                    card={card}
                    style={style}
                    className={cardClassName}
                    spellPower={store.me.spellPower}
                    draggable={false}
                    onClick={isMobilePortrait ? undefined : handleSpellOrWeaponClick}
                    onPointerDown={isMobilePortrait ? undefined : handleTargetedSpellPointerDown}
                    wrapper={wrapper}
                />
            );
        }

        return (
            <PlayerCardFace
                card={card}
                style={style}
                className={cardClassName}
                spellPower={store.me.spellPower}
                draggable={!isMobilePortrait && canPlay}
                onClick={isMobilePortrait ? undefined : handleSpellOrWeaponClick}
                onDragStart={() => store.cardDragStore.setCardDragged(card)}
                onDragEnd={() => store.cardDragStore.setCardDragged(null)}
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
