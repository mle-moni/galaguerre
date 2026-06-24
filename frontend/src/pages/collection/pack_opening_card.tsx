import type { ApiCatalogCard } from "#api_types/deck.types";
import clsx from "clsx";
import { useState } from "react";
import { CardBackFace } from "~/components/cards/card_back_face";
import { CardPreviewSheet } from "~/components/cards/card_preview_sheet";
import {
    CatalogCardDisplay,
    catalogCardToPlayerCard,
} from "~/components/cards/catalog_card_display";
import { usePackOpeningFullSize } from "~/hooks/use_pack_opening_full_size";
import "./pack_opening_card.css";

interface PackOpeningCardProps {
    card: ApiCatalogCard;
    isFlipped: boolean;
    canFlip: boolean;
    onFlip: () => void;
    animationDelay: string;
}

export const PackOpeningCard = ({
    card,
    isFlipped,
    canFlip,
    onFlip,
    animationDelay,
}: PackOpeningCardProps) => {
    const useFullSize = usePackOpeningFullSize();
    const [previewOpened, setPreviewOpened] = useState(false);
    const canPreview = !useFullSize && isFlipped;
    const isInteractive = canFlip || canPreview;

    const handleClick = () => {
        if (canFlip) {
            onFlip();
            return;
        }

        if (canPreview) {
            setPreviewOpened(true);
        }
    };

    return (
        <>
            <div className="pack-opening__card" style={{ animationDelay }}>
                <button
                    type="button"
                    className={clsx(
                        "pack-opening-card",
                        useFullSize && "pack-opening-card--full",
                        isFlipped && "pack-opening-card--flipped",
                        canFlip && "pack-opening-card--can-flip",
                        canPreview && "pack-opening-card--previewable",
                        !isInteractive && "pack-opening-card--inactive",
                    )}
                    onClick={handleClick}
                    aria-disabled={!isInteractive}
                    aria-label={
                        canFlip
                            ? "Retourner la carte"
                            : canPreview
                              ? `Voir ${card.label}`
                              : card.label
                    }
                >
                    <div className="pack-opening-card__inner">
                        <div className="pack-opening-card__face pack-opening-card__back">
                            <CardBackFace
                                className={useFullSize ? "playing-card-face--full" : undefined}
                            />
                        </div>
                        <div className="pack-opening-card__face pack-opening-card__front">
                            <CatalogCardDisplay
                                card={card}
                                size={useFullSize ? "full" : undefined}
                            />
                        </div>
                    </div>
                </button>
            </div>
            {canPreview ? (
                <CardPreviewSheet
                    card={catalogCardToPlayerCard(card)}
                    attack={card.type === "MINION" ? card.attack : undefined}
                    health={card.type === "MINION" ? card.health : undefined}
                    opened={previewOpened}
                    onClose={() => setPreviewOpened(false)}
                />
            ) : null}
        </>
    );
};
