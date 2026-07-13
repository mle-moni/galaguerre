import { TextInput } from "@mantine/core";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { CatalogCardDisplay } from "~/components/cards/catalog_card_display";
import { CenteredLoader } from "~/components/centered_loader";
import { useCardsQuery } from "~/hooks/use_cards";
import "./avatar_picker.css";

interface AvatarPickerProps {
    value: number | null;
    onChange: (cardId: number) => void;
    usePublicClient?: boolean;
    className?: string;
}

const pickRandomCardId = (cardIds: number[]) => {
    if (cardIds.length === 0) {
        return null;
    }

    const index = Math.floor(Math.random() * cardIds.length);
    return cardIds[index] ?? null;
};

export const AvatarPicker = ({
    value,
    onChange,
    usePublicClient = false,
    className,
}: AvatarPickerProps) => {
    const [search, setSearch] = useState("");
    const cardsQuery = useCardsQuery({ includeNonCollectible: true, usePublicClient });

    const cards = cardsQuery.data ?? [];

    const filteredCards = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) {
            return cards;
        }

        return cards.filter((card) => card.label.toLowerCase().includes(query));
    }, [cards, search]);

    useEffect(() => {
        if (value != null || cards.length === 0) {
            return;
        }

        const randomCardId = pickRandomCardId(cards.map((card) => card.id));

        if (randomCardId != null) {
            onChange(randomCardId);
        }
    }, [cards, onChange, value]);

    if (cardsQuery.isLoading) {
        return <CenteredLoader />;
    }

    return (
        <div className={clsx("avatar-picker", className)}>
            <TextInput
                className="avatar-picker__search"
                placeholder="Rechercher une carte..."
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                styles={{ input: { background: "rgba(255,255,255,0.08)", color: "white" } }}
            />

            {filteredCards.length === 0 ? (
                <p className="avatar-picker__empty">Aucune carte trouvée.</p>
            ) : (
                <div className="avatar-picker__grid">
                    {filteredCards.map((card) => (
                        <button
                            key={card.id}
                            type="button"
                            className={clsx(
                                "avatar-picker__card",
                                value === card.id && "avatar-picker__card--selected",
                            )}
                            onClick={() => onChange(card.id)}
                            title={card.label}
                            aria-label={`Choisir ${card.label} comme avatar`}
                            aria-pressed={value === card.id}
                        >
                            <CatalogCardDisplay card={card} variant="artwork" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
