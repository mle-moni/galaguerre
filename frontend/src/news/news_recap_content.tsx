import type { ApiCatalogCard } from "#api_types/deck.types";
import { CenteredLoader } from "~/components/centered_loader";
import { CatalogCardDisplay } from "~/components/cards/catalog_card_display";
import { useCardsQuery } from "~/hooks/use_cards";
import { formatBalanceChange } from "./format_balance_change.js";
import type { NewsBalanceEntry, CardRecapData } from "./generated/card_recaps.js";
import "./news_recap_cards.css";

const NewsRecapCard = ({
    card,
    changes,
    tone,
    isGolden = false,
}: {
    card: ApiCatalogCard;
    changes?: NewsBalanceEntry["changes"];
    tone?: "buff" | "nerf";
    isGolden?: boolean;
}) => (
    <div className="gg-catalog-card-slot news-recap-card-slot">
        <div className="gg-catalog-card-slot__preview">
            <CatalogCardDisplay card={card} isGolden={isGolden} />
        </div>
        {changes && changes.length > 0 && (
            <div
                className={`news-recap-card__changes${tone ? ` news-recap-card__changes--${tone}` : ""}`}
            >
                {changes.map((change) => (
                    <span key={`${change.field}-${change.from}-${change.to}`}>
                        {formatBalanceChange(change)}
                    </span>
                ))}
            </div>
        )}
    </div>
);

const NewsRecapCardById = ({
    cardId,
    cardsById,
    changes,
    tone,
    isGolden = false,
}: {
    cardId: number;
    cardsById: Map<number, ApiCatalogCard>;
    changes?: NewsBalanceEntry["changes"];
    tone?: "buff" | "nerf";
    isGolden?: boolean;
}) => {
    const card = cardsById.get(cardId);
    if (!card) return null;
    return <NewsRecapCard card={card} changes={changes} tone={tone} isGolden={isGolden} />;
};

export const NewsRecapContent = ({ recap }: { recap: CardRecapData }) => {
    const cardsQuery = useCardsQuery({ includeNonCollectible: true });

    if (cardsQuery.isLoading) return <CenteredLoader />;

    const cardsById = new Map((cardsQuery.data ?? []).map((card) => [card.id, card]));
    const newCardIdSet = new Set(recap.newCardIds);
    const goldenOnlyIds = recap.newGoldenCardIds.filter((id) => !newCardIdSet.has(id));
    const hasNewCards = recap.newCardIds.length > 0;
    const hasNewGoldens = goldenOnlyIds.length > 0;
    const hasBuffs = recap.buffs.length > 0;
    const hasNerfs = recap.nerfs.length > 0;

    return (
        <>
            <p>Récapitulatif des changements de cartes depuis la dernière mise à jour.</p>

            {hasNewCards && (
                <section className="news-recap-section">
                    <h2 className="news-recap-section__title">Nouvelles cartes</h2>
                    <div className="gg-catalog-grid news-recap-grid">
                        {recap.newCardIds.map((cardId) => (
                            <NewsRecapCardById
                                key={cardId}
                                cardId={cardId}
                                cardsById={cardsById}
                                isGolden={recap.newGoldenCardIds.includes(cardId)}
                            />
                        ))}
                    </div>
                </section>
            )}

            {hasNewGoldens && (
                <section className="news-recap-section">
                    <h2 className="news-recap-section__title">Versions golden</h2>
                    <div className="gg-catalog-grid news-recap-grid">
                        {goldenOnlyIds.map((cardId) => (
                            <NewsRecapCardById
                                key={cardId}
                                cardId={cardId}
                                cardsById={cardsById}
                                isGolden
                            />
                        ))}
                    </div>
                </section>
            )}

            {hasBuffs && (
                <section className="news-recap-section">
                    <h2 className="news-recap-section__title">Buffs</h2>
                    <div className="gg-catalog-grid news-recap-grid">
                        {recap.buffs.map((entry) => (
                            <NewsRecapCardById
                                key={entry.id}
                                cardId={entry.id}
                                cardsById={cardsById}
                                changes={entry.changes}
                                tone="buff"
                            />
                        ))}
                    </div>
                </section>
            )}

            {hasNerfs && (
                <section className="news-recap-section">
                    <h2 className="news-recap-section__title">Nerfs</h2>
                    <div className="gg-catalog-grid news-recap-grid">
                        {recap.nerfs.map((entry) => (
                            <NewsRecapCardById
                                key={entry.id}
                                cardId={entry.id}
                                cardsById={cardsById}
                                changes={entry.changes}
                                tone="nerf"
                            />
                        ))}
                    </div>
                </section>
            )}

            {!hasNewCards && !hasNewGoldens && !hasBuffs && !hasNerfs && (
                <p className="news-recap-empty">Aucun changement de carte.</p>
            )}
        </>
    );
};

export const createNewsRecapContent = (recap: CardRecapData) => {
    const RecapContent = () => <NewsRecapContent recap={recap} />;
    return RecapContent;
};
