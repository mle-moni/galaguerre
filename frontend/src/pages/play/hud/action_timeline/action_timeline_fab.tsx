import { IconHistory } from "@tabler/icons-react";
import { observer } from "mobx-react-lite";
import { useState } from "react";
import { useGameContext } from "~/hooks/use_game_state";
import { useUser } from "~/hooks/use_user";
import { ActionTimelineModal } from "./action_timeline_modal.jsx";
import "../mobile/mobile.css";

export const ActionTimelineFab = observer(() => {
    const { game } = useGameContext();
    const user = useUser();
    const [modalOpened, setModalOpened] = useState(false);

    const actionLog = game.data.actionLog ?? [];
    if (!user || actionLog.length === 0) return null;

    return (
        <>
            <button
                type="button"
                className="action-timeline-fab"
                aria-label="Historique des actions"
                onClick={() => setModalOpened(true)}
            >
                <IconHistory size={22} />
            </button>

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
