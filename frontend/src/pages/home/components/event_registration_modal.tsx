import { Button, Modal, Stack, Text } from "@mantine/core";
import { notifySuccess } from "~/services/toasts";
import { formatHomeEventDate, type HomeEvent } from "../home_mock_data";

interface EventRegistrationModalProps {
    event: HomeEvent | null;
    eventDate: Date | null;
    onClose: () => void;
}

export const EventRegistrationModal = ({
    event,
    eventDate,
    onClose,
}: EventRegistrationModalProps) => {
    const handleConfirm = () => {
        if (!event) return;

        notifySuccess(`Inscription confirmée pour ${event.title}`);
        onClose();
    };

    return (
        <Modal
            opened={event !== null}
            onClose={onClose}
            title="Confirmer l'inscription"
            centered
            size="md"
        >
            {event && eventDate && (
                <Stack gap="md">
                    <img
                        src={event.imageUrl}
                        alt={event.title}
                        className="home-event-modal__banner"
                    />
                    <div>
                        <Text className="text-white font-semibold">{event.title}</Text>
                        <Text size="sm" c="dimmed">
                            {formatHomeEventDate(eventDate)}
                        </Text>
                    </div>
                    <Text size="sm" className="text-white/80">
                        {event.shortDescription}
                    </Text>
                    <Text size="sm" className="text-white/70">
                        {event.longDescription}
                    </Text>
                    <div className="flex justify-end gap-2">
                        <Button variant="default" onClick={onClose}>
                            Annuler
                        </Button>
                        <Button className="gg-btn-primary" onClick={handleConfirm}>
                            Confirmer l'inscription
                        </Button>
                    </div>
                </Stack>
            )}
        </Modal>
    );
};
