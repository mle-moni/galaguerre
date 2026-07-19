import type { ApiCatalogCard } from "#api_types/deck.types";
import { Modal } from "@mantine/core";
import { CatalogCardDisplay } from "./catalog_card_display.jsx";
import { CardInspectStage } from "./card_inspect_stage.jsx";
import "./card_inspect_stage.css";

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
        withCloseButton={false}
        fullScreen
        padding={0}
        centered
        withinPortal
        transitionProps={{ transition: "fade", duration: 220 }}
        overlayProps={{ backgroundOpacity: 0.72, blur: 10 }}
        classNames={{
            content: "card-inspect-overlay",
            body: "card-inspect-overlay__body",
            inner: "card-inspect-overlay__inner",
        }}
    >
        {card && (
            <CardInspectStage
                key={`${card.id}-${isGolden ? "g" : "n"}`}
                label={card.label}
                rarity={card.rarity}
                isGolden={isGolden}
                onClose={onClose}
            >
                <CatalogCardDisplay card={card} size="full" isGolden={isGolden} />
            </CardInspectStage>
        )}
    </Modal>
);
