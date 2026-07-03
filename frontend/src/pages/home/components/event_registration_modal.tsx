import type { ApiEvent } from "#api_types/event.types";
import { Button, Modal, Stack, Text } from "@mantine/core";
import { useRegisterEventMutation } from "~/hooks/use_events";
import { notifyError, notifySuccess } from "~/services/toasts";

interface EventRegistrationModalProps {
    event: ApiEvent | null;
    onClose: () => void;
}

export const EventRegistrationModal = ({ event, onClose }: EventRegistrationModalProps) => {
    const registerMutation = useRegisterEventMutation();

    const handleConfirm = async () => {
        if (!event || event.isRegistered) return;

        try {
            await registerMutation.mutateAsync(event.id);
            notifySuccess(`Inscription confirmée pour ${event.title}`);
            onClose();
        } catch {
            notifyError("Impossible de confirmer l'inscription");
        }
    };

    return (
        <Modal opened={event !== null} onClose={onClose} title={event?.title} centered size="md">
            {event && (
                <Stack gap="md">
                    <img
                        src={event.imageUrl}
                        alt={event.title}
                        className="home-event-modal__banner"
                    />
                    <Text size="sm" component="p" m={0}>
                        {event.longDescription}
                    </Text>
                    <div className="flex justify-end gap-2">
                        <Button variant="default" onClick={onClose}>
                            Annuler
                        </Button>
                        <Button
                            className="gg-btn-primary"
                            onClick={handleConfirm}
                            loading={registerMutation.isPending}
                            disabled={event.isRegistered}
                        >
                            {event.isRegistered ? "Déjà inscrit" : "Confirmer l'inscription"}
                        </Button>
                    </div>
                </Stack>
            )}
        </Modal>
    );
};
