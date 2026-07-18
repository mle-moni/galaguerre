import type { ApiCatalogCard } from "#api_types/deck.types";
import { Modal } from "@mantine/core";
import { CardArtwork } from "./card_artwork.jsx";

interface CardArtworkModalProps {
    card: ApiCatalogCard | null;
    opened: boolean;
    onClose: () => void;
    isGolden?: boolean;
}

export const CardArtworkModal = ({
    card,
    opened,
    onClose,
    isGolden = false,
}: CardArtworkModalProps) => (
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
            <CardArtwork
                className="card-artwork-modal__image"
                imageUrl={card.imageUrl}
                goldenVideoUrl={card.goldenVideoUrl}
                isGolden={isGolden}
                alt={card.label}
            />
        )}
    </Modal>
);
