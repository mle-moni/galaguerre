import { observer } from "mobx-react-lite";
import { useState } from "react";
import { useGameContext } from "~/hooks/use_game_state";
import { useUser } from "~/hooks/use_user";
import { ActionLogEntry } from "./action_log_entry.jsx";
import { ActionTimelineModal } from "./action_timeline_modal.jsx";
import "./action_timeline.css";

const COMPACT_ENTRY_COUNT = 3;

export const ActionTimeline = observer(() => {
    const { game } = useGameContext();
    const user = useUser();
    const [modalOpened, setModalOpened] = useState(false);

    if (!user) return null;

    const actionLog = game.data.actionLog ?? [];
    const recentEntries = actionLog.slice(-COMPACT_ENTRY_COUNT).reverse();
    const hasMore = actionLog.length > COMPACT_ENTRY_COUNT;

    if (actionLog.length === 0) return null;

    return (
        <>
            <div className="action-timeline">
                {recentEntries.map((entry) => (
                    <ActionLogEntry
                        key={entry.id}
                        entry={entry}
                        game={game}
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
                game={game}
                currentUserId={user.id}
            />
        </>
    );
});
