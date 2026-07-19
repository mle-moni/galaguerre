import type { ApiOpenedPackCard } from "#api_types/collection.types";
import clsx from "clsx";
import { useState, type MouseEvent } from "react";
import { CardBackFace } from "~/components/cards/card_back_face";
import { CardInspectModal } from "~/components/cards/card_inspect_modal";
import { CatalogCardDisplay } from "~/components/cards/catalog_card_display";
import { usePackOpeningFullSize } from "~/hooks/use_pack_opening_full_size";
import { play } from "~/cuelume/index";
import "./pack_opening_card.css";

interface PackOpeningCardProps {
    card: ApiOpenedPackCard;
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
    const [showRarityHint, setShowRarityHint] = useState(false);
    const canPreview = isFlipped;
    const canPeekRarity = canFlip && !isFlipped;
    const isInteractive = canFlip || canPreview;

    const handleClick = () => {
        if (canFlip) {
            play("bloom");
            onFlip();
            return;
        }

        if (canPreview) {
            setPreviewOpened(true);
        }
    };

    const handleTouchStart = () => {
        if (canPeekRarity) {
            setShowRarityHint(true);
        }
    };

    const handleTouchEnd = () => {
        setShowRarityHint(false);
    };

    const handleContextMenu = (event: MouseEvent<HTMLButtonElement>) => {
        if (canPeekRarity) {
            event.preventDefault();
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
                        showRarityHint && "pack-opening-card--rarity-hint",
                        card.isGolden && "pack-opening-card--golden",
                        !isInteractive && "pack-opening-card--inactive",
                    )}
                    onClick={handleClick}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                    onContextMenu={handleContextMenu}
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
                        <div
                            className={clsx(
                                "pack-opening-card__face pack-opening-card__back",
                                !isFlipped &&
                                    `pack-opening-card__back--${card.rarity.toLowerCase()}`,
                            )}
                        >
                            <CardBackFace
                                className={useFullSize ? "playing-card-face--full" : undefined}
                            />
                        </div>
                        <div className="pack-opening-card__face pack-opening-card__front">
                            <CatalogCardDisplay
                                card={card}
                                isGolden={card.isGolden}
                                size={useFullSize ? "full" : undefined}
                            />
                        </div>
                    </div>
                </button>
            </div>
            <CardInspectModal
                card={card}
                opened={previewOpened}
                onClose={() => setPreviewOpened(false)}
                isGolden={card.isGolden}
            />
        </>
    );
};
