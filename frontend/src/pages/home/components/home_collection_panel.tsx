import { CARD_RARITY_LABELS, type CardRarity } from "#api_types/card_rarity.types";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { entriesToOwnedCounts, useCollectionQuery } from "~/hooks/use_collection";
import { useCardsQuery } from "~/hooks/use_cards";
import { HomePanel } from "./home_panel.jsx";

const COLLECTION_RARITIES: CardRarity[] = ["COMMON", "RARE", "EPIC", "LEGENDARY"];

const emptyCountsByRarity = (): Record<CardRarity, number> => ({
    COMMON: 0,
    RARE: 0,
    EPIC: 0,
    LEGENDARY: 0,
});

export const HomeCollectionPanel = () => {
    const collectionQuery = useCollectionQuery();
    const cardsQuery = useCardsQuery();

    const countsByRarity = useMemo(() => {
        const counts = emptyCountsByRarity();
        const ownedCounts = entriesToOwnedCounts(collectionQuery.data ?? []);
        const catalogById = new Map((cardsQuery.data ?? []).map((card) => [card.id, card]));

        for (const [cardId, count] of ownedCounts) {
            const card = catalogById.get(cardId);
            if (card) {
                counts[card.rarity] += count;
            }
        }

        return counts;
    }, [collectionQuery.data, cardsQuery.data]);

    const isLoading = collectionQuery.isLoading || cardsQuery.isLoading;

    return (
        <HomePanel
            title="Collection"
            headerRight={
                <Link to="/collection" className="home-panel__link">
                    Voir tout
                </Link>
            }
        >
            {isLoading ? (
                <p className="home-panel__muted">Chargement…</p>
            ) : (
                <div className="home-collection">
                    {COLLECTION_RARITIES.map((rarity) => (
                        <div key={rarity} className="home-collection__item">
                            <span
                                className={`home-collection__label home-collection__label--${rarity.toLowerCase()}`}
                            >
                                {CARD_RARITY_LABELS[rarity]}
                            </span>
                            <span className="home-collection__count">
                                {countsByRarity[rarity].toLocaleString("fr-FR")}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </HomePanel>
    );
};
