import clsx from "clsx";
import { observer } from "mobx-react-lite";
import {
    type CSSProperties,
    type PointerEvent as ReactPointerEvent,
    useEffect,
    useRef,
    useState,
} from "react";
import { PlayerCardFace } from "~/components/cards/player_card_face";
import { resolveBoardInsertIndexFromPoint } from "~/helpers/resolve_target_from_point";
import { useGameContext } from "~/hooks/use_game_state";
import { notifyError } from "~/services/toasts";
import { countBoardMinionsOnBoard, playerHasBoardSpace } from "#api_types/board";
import type { GamePlayer, PlayerCard, SpellCard } from "#api_types/game.types";
import {
    type MobileHandGestureIntent,
    getMobileHandCardRatio,
    hasBrowsedMobileHand,
    hasLiftedMobileCard,
    isPointInsideMobileBounds,
    resolveMobileHandGestureIntent,
    resolveMobileHandIndex,
} from "#shared/mobile_hand_gesture";
import { PlayingCard } from "../playing_card/playing_card.jsx";

interface MobilePlayerHandProps {
    player: GamePlayer;
}

type Point = { x: number; y: number };
type LiftMode = "NONE" | "MINION" | "IMMEDIATE" | "TARGETED_SPELL" | "REJECTED";

interface ActiveGesture {
    pointerId: number;
    origin: Point;
    selectedIndex: number;
    initialIndex: number;
    hasBrowsed: boolean;
    intent: MobileHandGestureIntent;
    mode: LiftMode;
}

export const MobilePlayerHand = observer(({ player }: MobilePlayerHandProps) => {
    const { store } = useGameContext();
    const handRef = useRef<HTMLDivElement>(null);
    const gestureRef = useRef<ActiveGesture | null>(null);
    const suppressClickRef = useRef(false);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [dragPoint, setDragPoint] = useState<Point | null>(null);
    const [isLifted, setIsLifted] = useState(false);
    const [isInCancelZone, setIsInCancelZone] = useState(false);

    const selectedCard = selectedIndex === null ? null : player.hand[selectedIndex] ?? null;

    useEffect(() => {
        if (selectedIndex !== null && selectedIndex >= player.hand.length) {
            setSelectedIndex(player.hand.length > 0 ? player.hand.length - 1 : null);
        }
    }, [player.hand.length, selectedIndex]);

    useEffect(() => {
        const handleOutsidePointerDown = (event: PointerEvent) => {
            if (!(event.target instanceof Element)) return;
            if (event.target.closest("[data-mobile-player-hand]")) return;
            setSelectedIndex(null);
        };

        document.addEventListener("pointerdown", handleOutsidePointerDown);
        return () => document.removeEventListener("pointerdown", handleOutsidePointerDown);
    }, []);

    const canPlayCard = (card: PlayerCard): boolean =>
        store.isMyTurn &&
        !store.isInputBlocked &&
        card.cost <= store.me.mana &&
        (card.type !== "MINION" || playerHasBoardSpace(store.me)) &&
        (card.type !== "SPELL" ||
            !store.targetSelectionStore.requiresTarget(card) ||
            store.targetSelectionStore.hasPlayableTarget(card));

    const notifyCannotPlay = (card: PlayerCard) => {
        if (!store.isMyTurn) {
            notifyError("Ce n'est pas votre tour");
            return;
        }

        if (card.cost > store.me.mana) {
            notifyError("Vous n'avez pas assez de mana pour jouer cette carte");
            return;
        }

        if (card.type === "MINION" && !playerHasBoardSpace(store.me)) {
            notifyError("Votre plateau est plein (7 monstres maximum)");
            return;
        }

        notifyError("Cette carte ne peut pas être jouée maintenant");
    };

    const getCardAtGestureIndex = (gesture: ActiveGesture): PlayerCard | null =>
        player.hand[gesture.selectedIndex] ?? null;

    const isInsideCardCancelZone = (point: Point): boolean => {
        const cancelZone = handRef.current?.closest<HTMLElement>(".mobile-game-layout__bottom");
        const bounds =
            cancelZone?.getBoundingClientRect() ?? handRef.current?.getBoundingClientRect();

        return bounds ? isPointInsideMobileBounds(point, bounds) : false;
    };

    const updateMinionDropPreview = (point: Point) => {
        const dropZone = document.querySelector<HTMLElement>(
            '[data-minion-drop-zone][data-spot-owner="PLAYER"]',
        );

        if (!dropZone || !isPointInsideMobileBounds(point, dropZone.getBoundingClientRect())) {
            store.cardDragStore.leaveMinionDropZone();
            return;
        }

        store.cardDragStore.enterMinionDropZone();
        const boardIndex =
            resolveBoardInsertIndexFromPoint(point.x, "PLAYER") ??
            countBoardMinionsOnBoard(store.me.board);
        store.cardDragStore.setPreviewInsertIndex(boardIndex);
    };

    const beginLift = (gesture: ActiveGesture, card: PlayerCard, point: Point) => {
        suppressClickRef.current = true;

        if (!canPlayCard(card)) {
            gesture.mode = "REJECTED";
            notifyCannotPlay(card);
            return;
        }

        setIsLifted(true);
        setDragPoint(point);
        setIsInCancelZone(false);

        if (card.type === "MINION") {
            gesture.mode = "MINION";
            store.cardDragStore.setCardDragged(card);
            updateMinionDropPreview(point);
            return;
        }

        if (card.type === "SPELL" && store.targetSelectionStore.requiresTarget(card)) {
            gesture.mode = "TARGETED_SPELL";
            return;
        }

        gesture.mode = "IMMEDIATE";
    };

    const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!event.isPrimary || event.button !== 0) return;
        if (!(event.target instanceof Element)) return;
        if (event.target.closest(".card-detail-info-button")) return;

        const cardElement = event.target.closest<HTMLElement>("[data-hand-card-index]");
        const indexAttribute = cardElement?.dataset.handCardIndex;
        if (indexAttribute === undefined) return;

        const index = Number(indexAttribute);
        if (!Number.isInteger(index) || !player.hand[index]) return;

        event.currentTarget.setPointerCapture(event.pointerId);
        gestureRef.current = {
            pointerId: event.pointerId,
            origin: { x: event.clientX, y: event.clientY },
            selectedIndex: index,
            initialIndex: index,
            hasBrowsed: false,
            intent: "UNDECIDED",
            mode: "NONE",
        };
        suppressClickRef.current = false;
        setSelectedIndex(index);
        setDragPoint(null);
        setIsLifted(false);
        setIsInCancelZone(false);
    };

    const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        const gesture = gestureRef.current;
        if (!gesture || gesture.pointerId !== event.pointerId) return;

        const point = { x: event.clientX, y: event.clientY };

        if (gesture.mode === "NONE") {
            gesture.intent = resolveMobileHandGestureIntent(gesture.origin, point, gesture.intent);

            if (gesture.intent === "BROWSE") {
                const handRect = event.currentTarget.getBoundingClientRect();
                const firstCard =
                    event.currentTarget.querySelector<HTMLElement>("[data-playing-card]");
                const cardWidth = firstCard?.getBoundingClientRect().width ?? 1;
                const nextIndex = resolveMobileHandIndex({
                    clientX: event.clientX,
                    handLeft: handRect.left,
                    handWidth: handRect.width,
                    cardWidth,
                    cardCount: player.hand.length,
                });

                gesture.selectedIndex = nextIndex;
                gesture.hasBrowsed ||= hasBrowsedMobileHand(gesture.origin, point);
                setSelectedIndex(nextIndex);
            }

            if (gesture.intent === "PLAY" && hasLiftedMobileCard(gesture.origin, point)) {
                const card = getCardAtGestureIndex(gesture);
                if (card) beginLift(gesture, card, point);
            }
        }

        if (gesture.mode !== "NONE" && gesture.mode !== "REJECTED") {
            setDragPoint(point);
            setIsInCancelZone(isInsideCardCancelZone(point));
        }

        if (gesture.mode === "MINION") {
            updateMinionDropPreview(point);
        }
    };

    const finishTargetedSpell = (card: SpellCard, point: Point) => {
        const battlefield = document.querySelector<HTMLElement>(".mobile-game-layout__board");
        if (
            !battlefield ||
            !isPointInsideMobileBounds(point, battlefield.getBoundingClientRect())
        ) {
            return;
        }

        store.targetSelectionStore.startSpellTargetSelection(card);
    };

    const finishMinionDrop = (card: PlayerCard, point: Point) => {
        const boardIndex = store.cardDragStore.previewInsertIndex;
        const canDrop =
            card.type === "MINION" &&
            store.cardDragStore.isOverMinionDropZone &&
            boardIndex !== null &&
            store.cardDragStore.canPlayAtIndex(boardIndex);

        if (canDrop) {
            store.cardDragStore.handleDrop(card, boardIndex, "PLAYER", point);
        } else {
            store.cardDragStore.setCardDragged(null);
            store.cardDragStore.leaveMinionDropZone();
        }
    };

    const resetGestureVisuals = () => {
        gestureRef.current = null;
        setSelectedIndex(null);
        setDragPoint(null);
        setIsLifted(false);
        setIsInCancelZone(false);
    };

    const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
        const gesture = gestureRef.current;
        if (!gesture || gesture.pointerId !== event.pointerId) return;

        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        suppressClickRef.current = true;

        const card = getCardAtGestureIndex(gesture);
        const point = { x: event.clientX, y: event.clientY };
        const releasedInCancelZone = isInsideCardCancelZone(point);

        if (gesture.mode !== "NONE" && releasedInCancelZone) {
            if (gesture.mode === "MINION") {
                store.cardDragStore.setCardDragged(null);
                store.cardDragStore.leaveMinionDropZone();
            }
            suppressClickRef.current = true;
            resetGestureVisuals();
            return;
        }

        if (card && gesture.mode === "MINION") {
            finishMinionDrop(card, point);
            setSelectedIndex(null);
        } else if (card?.type === "SPELL" && gesture.mode === "TARGETED_SPELL") {
            finishTargetedSpell(card, point);
            setSelectedIndex(null);
        } else if (card && card.type !== "MINION" && gesture.mode === "IMMEDIATE") {
            store.targetSelectionStore.armCard(card);
            store.targetSelectionStore.confirmArmedPlay();
            setSelectedIndex(null);
        } else if (gesture.hasBrowsed || gesture.selectedIndex !== gesture.initialIndex) {
            suppressClickRef.current = true;
        }

        resetGestureVisuals();
    };

    const handlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
        const gesture = gestureRef.current;
        if (!gesture || gesture.pointerId !== event.pointerId) return;

        if (gesture.mode === "MINION") {
            store.cardDragStore.setCardDragged(null);
            store.cardDragStore.leaveMinionDropZone();
        }
        resetGestureVisuals();
    };

    return (
        <div className="mobile-hand" data-mobile-player-hand>
            {selectedCard && (
                <div
                    className={clsx(
                        "mobile-hand__preview",
                        isLifted && "mobile-hand__preview--dragging",
                        isInCancelZone && "mobile-hand__preview--canceling",
                    )}
                    style={
                        (isLifted && dragPoint
                            ? {
                                  "--mobile-hand-pointer-x": `${dragPoint.x}px`,
                                  "--mobile-hand-pointer-y": `${dragPoint.y}px`,
                              }
                            : undefined) as CSSProperties | undefined
                    }
                    data-mobile-hand-preview
                    aria-live="polite"
                >
                    <PlayerCardFace
                        card={selectedCard}
                        size="full"
                        spellPower={store.me.spellPower}
                        attack={selectedCard.type === "MINION" ? selectedCard.attack : undefined}
                        health={selectedCard.type === "MINION" ? selectedCard.health : undefined}
                        className="mobile-hand__preview-card"
                    />
                    <span className="mobile-hand__preview-hint">
                        {isInCancelZone
                            ? "Relâchez pour annuler"
                            : isLifted
                              ? "Relâchez pour jouer"
                              : "Glissez pour parcourir · montez pour jouer"}
                    </span>
                </div>
            )}

            <div
                ref={handRef}
                className="card-hand card-hand--mobile"
                data-animation-hand
                data-animation-owner="PLAYER"
                data-mobile-hand-count={player.hand.length}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
                onContextMenu={(event) => event.preventDefault()}
                onClickCapture={(event) => {
                    if (!suppressClickRef.current) return;
                    event.preventDefault();
                    event.stopPropagation();
                    suppressClickRef.current = false;
                }}
            >
                {player.hand.map((card, index) => {
                    const ratio = getMobileHandCardRatio(index, player.hand.length);
                    const centeredIndex = index - (player.hand.length - 1) / 2;
                    const rotation = centeredIndex * 1.25;
                    const translationY = Math.abs(centeredIndex) * 1.25;
                    const isSelected = selectedIndex === index;

                    return (
                        <div
                            key={card.uuid}
                            className={clsx(
                                "card-hand__card",
                                isSelected && "card-hand__card--selected",
                            )}
                            data-hand-card-index={index}
                            style={{
                                left: `calc((100% - var(--card-w-hand)) * ${ratio})`,
                                rotate: `${rotation}deg`,
                                transform: `translateY(${translationY - (isSelected ? 8 : 0)}px)`,
                                zIndex: isSelected ? player.hand.length + 1 : index + 1,
                            }}
                        >
                            <PlayingCard card={card} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
});
