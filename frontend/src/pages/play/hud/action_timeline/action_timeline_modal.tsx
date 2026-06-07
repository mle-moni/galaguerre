import type { ApiGame, GameLogEntry } from "#api_types/game.types";
import { Modal, ScrollArea, Text } from "@mantine/core";
import { ActionLogEntry } from "./action_log_entry.jsx";
import "./action_timeline.css";

interface ActionTimelineModalProps {
    opened: boolean;
    onClose: () => void;
    entries: GameLogEntry[];
    game: ApiGame;
    currentUserId: number;
}

export const ActionTimelineModal = ({
    opened,
    onClose,
    entries,
    game,
    currentUserId,
}: ActionTimelineModalProps) => {
    return (
        <Modal opened={opened} onClose={onClose} title="Historique des actions" size="md" centered>
            {entries.length === 0 ? (
                <Text size="sm" c="dimmed">
                    Aucune action enregistrée pour le moment.
                </Text>
            ) : (
                <ScrollArea.Autosize mah={400}>
                    {[...entries].reverse().map((entry) => (
                        <div key={entry.id} className="action-timeline-modal__entry">
                            <Text size="xs" c="dimmed" mb={2}>
                                Tour {entry.roundNumber}
                            </Text>
                            <ActionLogEntry
                                entry={entry}
                                game={game}
                                currentUserId={currentUserId}
                            />
                        </div>
                    ))}
                </ScrollArea.Autosize>
            )}
        </Modal>
    );
};
