import "./board.css";
import "~/components/targeting/targeting.css";

import type { SpotOwner } from "#api_types/game.types";
import { getOccupiedBoardEntries } from "#api_types/board";
import type { MinionCard } from "#api_types/game.types";

import clsx from "clsx";
import { observer } from "mobx-react-lite";
import type { CSSProperties, DragEvent, ReactNode } from "react";
import { BoardMinionToken } from "~/components/cards/board_minion_token";
import { useGameContext } from "~/hooks/use_game_state";
import { resolveBoardInsertIndexFromPoint } from "~/helpers/resolve_target_from_point";
import type { GameStore } from "~/stores/GameStore";
import { RenderMinion } from "../hud/playing_card/render_minion.jsx";
import { useTurnRopeProgress } from "./use_turn_rope_progress.js";

const BOARD_SHIFT_PX = "calc(var(--board-minion-w) * 0.55)";

export const Board = observer(() => {
    return (
        <div
            className="flex flex-col h-full justify-center items-center min-h-0"
            data-animation-board
        >
            <BoardSide spotOwner="OPPONENT" />
            <BoardDivider />
            <BoardSide spotOwner="PLAYER" />
        </div>
    );
});

const BoardDivider = observer(() => {
    const { store } = useGameContext();
    const ropeProgress = useTurnRopeProgress(store.game.data.turnEndsAt);
    const isRopeActive = ropeProgress > 0;

    if (!isRopeActive) return null;

    return (
        <div
            className="board-divider w-full flex-shrink-0"
            style={{ "--board-divider-rope-progress": ropeProgress } as CSSProperties}
            aria-hidden
        >
            <div className="board-divider__rope" />
        </div>
    );
});

interface BoardSideProps {
    spotOwner: SpotOwner;
}

const BoardSide = observer(({ spotOwner }: BoardSideProps) => {
    const { store } = useGameContext();
    const board = spotOwner === "OPPONENT" ? store.opponent.board : store.me.board;
    const entries = getOccupiedBoardEntries(board);

    if (spotOwner === "OPPONENT") {
        return (
            <div className="board-side flex-1 min-h-0 w-full flex justify-center items-center">
                <div className="board-row board-row--centered">
                    {entries.map((entry) => (
                        <BoardMinionSlot
                            key={entry.minion.uuid}
                            store={store}
                            boardIndex={entry.boardIndex}
                            minionUuid={entry.minion.uuid}
                            spotOwner={spotOwner}
                            shouldShiftRight={false}
                        >
                            <RenderMinion state={entry.minion} spotOwner={spotOwner} />
                        </BoardMinionSlot>
                    ))}
                </div>
            </div>
        );
    }

    const { cardDragStore } = store;
    const cardDragged = cardDragStore.cardDragged;
    const previewInsertIndex = cardDragStore.previewInsertIndex;
    const isOverDropZone = cardDragStore.isOverMinionDropZone;
    const isShowingHint = cardDragStore.isShowingMinionPlayHint;
    const activeMinionCard = cardDragStore.activeMinionCard;

    const insertionSlotCount = entries.length + 1;
    const isEmptyBoard = entries.length === 0;

    const showDropZone = cardDragged?.type === "MINION";
    const showInsertionSlots = (cardDragged !== null && isOverDropZone) || isShowingHint;
    const showGhost = cardDragged !== null && isOverDropZone && previewInsertIndex !== null;

    const handleDropZoneDragEnter = (event: DragEvent<HTMLDivElement>) => {
        if (cardDragged?.type !== "MINION") return;
        event.preventDefault();
        cardDragStore.enterMinionDropZone();
    };

    const handleDropZoneDragLeave = (event: DragEvent<HTMLDivElement>) => {
        if (cardDragged?.type !== "MINION") return;
        if (event.currentTarget.contains(event.relatedTarget as Node)) return;
        cardDragStore.leaveMinionDropZone();
    };

    const handleDropZoneDragOver = (event: DragEvent<HTMLDivElement>) => {
        if (cardDragged?.type !== "MINION") return;
        event.preventDefault();

        if (!cardDragStore.isOverMinionDropZone) {
            cardDragStore.enterMinionDropZone();
        }

        const boardIndex =
            resolveBoardInsertIndexFromPoint(event.clientX, spotOwner) ?? (isEmptyBoard ? 0 : null);
        if (boardIndex !== null) {
            cardDragStore.setPreviewInsertIndex(boardIndex);
        }
    };

    const handleDropZoneDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        if (store.targetSelectionStore.isSelectingTarget) return;
        if (cardDragged?.type !== "MINION" || !isOverDropZone || previewInsertIndex === null) {
            return;
        }

        if (!cardDragStore.canPlayAtIndex(previewInsertIndex)) return;

        cardDragStore.handleDrop(cardDragged, previewInsertIndex, spotOwner, {
            x: event.clientX,
            y: event.clientY,
        });
        cardDragStore.setCardDragged(null);
    };

    return (
        <div className="board-side flex-1 min-h-0 w-full flex justify-center items-center">
            <div
                data-minion-drop-zone
                data-spot-owner={spotOwner}
                className={clsx(
                    "board-player-drop-zone",
                    showDropZone && "board-player-drop-zone--active",
                )}
                onDragEnter={handleDropZoneDragEnter}
                onDragLeave={handleDropZoneDragLeave}
                onDragOver={handleDropZoneDragOver}
                onDrop={handleDropZoneDrop}
            >
                <div
                    className={clsx(
                        "board-row board-row--centered",
                        isEmptyBoard && "board-player-drop-row",
                    )}
                    data-player-board-row
                    data-spot-owner={spotOwner}
                >
                    {Array.from({ length: insertionSlotCount }, (_, boardIndex) => {
                        const entry = entries[boardIndex];
                        const isGhostTarget = showGhost && previewInsertIndex === boardIndex;

                        return (
                            <div key={`player-slot-${boardIndex}`} className="board-minion-group">
                                <InsertionZone
                                    store={store}
                                    spotOwner={spotOwner}
                                    boardIndex={boardIndex}
                                    isPrimary={isEmptyBoard}
                                    showInsertionSlots={showInsertionSlots}
                                    isClickArmed={isShowingHint && cardDragged === null}
                                    isHoverTarget={isGhostTarget}
                                />

                                {isGhostTarget && activeMinionCard?.type === "MINION" && (
                                    <BoardPlacementGhost card={activeMinionCard} />
                                )}

                                {entry && (
                                    <BoardMinionSlot
                                        store={store}
                                        boardIndex={entry.boardIndex}
                                        minionUuid={entry.minion.uuid}
                                        spotOwner={spotOwner}
                                        shouldShiftRight={
                                            showGhost &&
                                            previewInsertIndex !== null &&
                                            previewInsertIndex <= boardIndex
                                        }
                                    >
                                        <RenderMinion state={entry.minion} spotOwner={spotOwner} />
                                    </BoardMinionSlot>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
});

interface InsertionZoneProps {
    store: GameStore;
    spotOwner: SpotOwner;
    boardIndex: number;
    isPrimary?: boolean;
    showInsertionSlots?: boolean;
    isClickArmed?: boolean;
    isHoverTarget?: boolean;
}

const InsertionZone = observer(
    ({
        store,
        spotOwner,
        boardIndex,
        isPrimary,
        showInsertionSlots = false,
        isClickArmed = false,
        isHoverTarget = false,
    }: InsertionZoneProps) => {
        const { cardDragStore } = store;
        const canDrop = cardDragStore.canPlayAtIndex(boardIndex);

        const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
            if (cardDragStore.cardDragged?.type !== "MINION") return;
            event.preventDefault();
            if (!cardDragStore.isOverMinionDropZone) {
                cardDragStore.enterMinionDropZone();
            }
            cardDragStore.setPreviewInsertIndex(boardIndex);
        };

        const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
            if (cardDragStore.cardDragged?.type !== "MINION") return;
            event.preventDefault();
            cardDragStore.enterMinionDropZone();
            cardDragStore.setPreviewInsertIndex(boardIndex);
        };

        const handleDrop = (event: DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            event.stopPropagation();
            if (store.targetSelectionStore.isSelectingTarget) return;

            const card = cardDragStore.cardDragged;
            if (
                !card ||
                !cardDragStore.isOverMinionDropZone ||
                cardDragStore.previewInsertIndex !== boardIndex
            ) {
                return;
            }

            cardDragStore.handleDrop(card, boardIndex, spotOwner, {
                x: event.clientX,
                y: event.clientY,
            });
            cardDragStore.setCardDragged(null);
        };

        const handleClick = () => {
            store.handleBoardIndexDrop(boardIndex, spotOwner);
        };

        if (spotOwner !== "PLAYER") return null;

        return (
            <div
                data-board-insertion-zone
                data-board-index={boardIndex}
                data-spot-owner={spotOwner}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDrop={handleDrop}
                onClick={handleClick}
                className={clsx(
                    "board-insertion-zone",
                    showInsertionSlots && "board-insertion-zone--active",
                    isPrimary && "board-insertion-zone--primary",
                    isClickArmed && "board-insertion-zone--click-armed",
                    showInsertionSlots && canDrop && "board-insertion-zone--available",
                    showInsertionSlots && !canDrop && "board-insertion-zone--unavailable",
                    isHoverTarget && canDrop && "board-insertion-zone--hover-valid",
                    isHoverTarget && !canDrop && "board-insertion-zone--hover-invalid",
                )}
            />
        );
    },
);

interface BoardMinionSlotProps {
    store: GameStore;
    boardIndex: number;
    minionUuid: string;
    spotOwner: SpotOwner;
    shouldShiftRight: boolean;
    children: ReactNode;
}

const BoardMinionSlot = observer(
    ({
        store,
        boardIndex,
        minionUuid,
        spotOwner,
        shouldShiftRight,
        children,
    }: BoardMinionSlotProps) => {
        const highlight = store.getMinionBoardTargetHighlight(boardIndex, spotOwner);
        const borderColor =
            highlight === "none"
                ? store.getMinionBoardBackgroundColor(boardIndex, spotOwner)
                : undefined;

        const style: CSSProperties | undefined = shouldShiftRight
            ? { transform: `translateX(${BOARD_SHIFT_PX})` }
            : undefined;

        return (
            <div
                data-target-zone
                data-board-index={boardIndex}
                data-minion-uuid={minionUuid}
                data-spot-owner={spotOwner}
                style={style}
                onClick={() => store.handleDrop(boardIndex, spotOwner)}
                className={clsx(
                    "board-minion-slot",
                    shouldShiftRight && "board-minion-slot--shifted",
                    highlight === "valid" && "target-zone--valid",
                    highlight === "invalid" && "target-zone--invalid",
                )}
            >
                <div
                    className="board-minion-slot__frame"
                    style={highlight === "none" ? { borderColor } : undefined}
                >
                    {children}
                </div>
            </div>
        );
    },
);

interface BoardPlacementGhostProps {
    card: MinionCard;
}

const BoardPlacementGhost = ({ card }: BoardPlacementGhostProps) => (
    <div className="board-placement-ghost" aria-hidden>
        <BoardMinionToken
            card={card}
            attack={card.attack}
            health={card.health}
            className="board-minion-token--ghost"
        />
    </div>
);
