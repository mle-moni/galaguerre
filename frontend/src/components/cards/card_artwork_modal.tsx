import type { ApiCatalogCard } from "#api_types/deck.types";
import { Modal } from "@mantine/core";

interface CardArtworkModalProps {
    card: ApiCatalogCard | null;
    opened: boolean;
    onClose: () => void;
}

export const CardArtworkModal = ({ card, opened, onClose }: CardArtworkModalProps) => (
    <Modal
        opened={opened}
        onClose={onClose}
        title={card?.label}
        size="auto"
        centered
        padding="md"
        withinPortal
        classNames={{ content: "card-artwork-modal" }}
    >
        {card && (
            <img
                src={card.imageUrl}
                alt={card.label}
                className="card-artwork-modal__image"
                draggable={false}
            />
        )}
    </Modal>
);
