import { observer } from "mobx-react-lite";
import { useState } from "react";
import { useGameContext } from "~/hooks/use_game_state";
import { useUser } from "~/hooks/use_user";
import { ActionLogEntry } from "./action_log_entry.jsx";
import { ActionTimelineModal } from "./action_timeline_modal.jsx";
import { useActionTimelinePosition } from "./use_action_timeline_position.js";
import "./action_timeline.css";

const COMPACT_ENTRY_COUNT = 3;

export const ActionTimeline = observer(() => {
    const { authoritativeGame } = useGameContext();
    const user = useUser();
    const [modalOpened, setModalOpened] = useState(false);

    const actionLog = authoritativeGame.data.actionLog ?? [];
    const hasEntries = actionLog.length > 0;
    const {
        elementRef,
        position,
        isDragging,
        handleDragHandlePointerDown,
        handleDragHandlePointerMove,
        handleDragHandlePointerUp,
        handleDragHandlePointerCancel,
    } = useActionTimelinePosition(hasEntries);

    if (!user || !hasEntries) return null;

    const recentEntries = actionLog.slice(-COMPACT_ENTRY_COUNT).reverse();
    const hasMore = actionLog.length > COMPACT_ENTRY_COUNT;

    return (
        <>
            <div
                ref={elementRef}
                className={[
                    "action-timeline",
                    position ? "action-timeline--positioned" : "",
                    isDragging ? "action-timeline--dragging" : "",
                ]
                    .filter(Boolean)
                    .join(" ")}
                style={
                    position
                        ? {
                              left: position.x,
                              top: position.y,
                          }
                        : undefined
                }
            >
                <div
                    className="action-timeline__drag-handle"
                    onPointerDown={handleDragHandlePointerDown}
                    onPointerMove={handleDragHandlePointerMove}
                    onPointerUp={handleDragHandlePointerUp}
                    onPointerCancel={handleDragHandlePointerCancel}
                    aria-label="Déplacer la timeline"
                >
                    <span className="action-timeline__drag-grip" aria-hidden="true" />
                    <span className="action-timeline__drag-label">Historique</span>
                </div>
                {recentEntries.map((entry) => (
                    <ActionLogEntry
                        key={entry.id}
                        entry={entry}
                        game={authoritativeGame}
                        currentUserId={user.id}
                    />
                ))}
                {hasMore && (
                    <button
                        type="button"
                        className="action-timeline__more"
                        onClick={() => setModalOpened(true)}
                    >
                        Plus ({actionLog.length} actions)
                    </button>
                )}
            </div>

            <ActionTimelineModal
                opened={modalOpened}
                onClose={() => setModalOpened(false)}
                entries={actionLog}
                game={authoritativeGame}
                currentUserId={user.id}
            />
        </>
    );
});
