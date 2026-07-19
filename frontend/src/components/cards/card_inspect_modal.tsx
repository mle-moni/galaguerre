import type { ApiCatalogCard } from "#api_types/deck.types";
import { Modal } from "@mantine/core";
import { CatalogCardDisplay } from "./catalog_card_display.jsx";
import { HoloCardShell } from "./holo_card_shell.jsx";
import "./card_inspect_modal.css";

interface CardInspectModalProps {
    card: ApiCatalogCard | null;
    opened: boolean;
    onClose: () => void;
    isGolden?: boolean;
}

export const CardInspectModal = ({
    card,
    opened,
    onClose,
    isGolden = false,
}: CardInspectModalProps) => (
    <Modal
        opened={opened}
        onClose={onClose}
        title={card?.label}
        size="auto"
        centered
        padding="md"
        withinPortal
        classNames={{
            content: "card-inspect-modal",
            body: "card-inspect-modal__body",
            header: "card-inspect-modal__header",
            title: "card-inspect-modal__title",
        }}
    >
        {card && (
            <HoloCardShell
                rarity={card.rarity}
                isGolden={isGolden}
                className="card-inspect-modal__shell"
            >
                <CatalogCardDisplay card={card} size="full" isGolden={isGolden} />
            </HoloCardShell>
        )}
    </Modal>
);
