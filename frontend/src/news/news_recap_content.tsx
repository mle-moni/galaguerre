import type { ApiCatalogCard } from "#api_types/deck.types";
import { CenteredLoader } from "~/components/centered_loader";
import { CatalogCardDisplay } from "~/components/cards/catalog_card_display";
import { useCardsQuery } from "~/hooks/use_cards";
import { formatBalanceChange } from "./format_balance_change.js";
import type { NewsBalanceEntry, WeeklyRecapData } from "./generated/weekly_recaps.js";
import "./news_recap_cards.css";

const NewsRecapCard = ({
    card,
    changes,
    tone,
}: {
    card: ApiCatalogCard;
    changes?: NewsBalanceEntry["changes"];
    tone?: "buff" | "nerf";
}) => (
    <div className="gg-catalog-card-slot news-recap-card-slot">
        <div className="gg-catalog-card-slot__preview">
            <CatalogCardDisplay card={card} />
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
}: {
    cardId: number;
    cardsById: Map<number, ApiCatalogCard>;
    changes?: NewsBalanceEntry["changes"];
    tone?: "buff" | "nerf";
}) => {
    const card = cardsById.get(cardId);
    if (!card) return null;
    return <NewsRecapCard card={card} changes={changes} tone={tone} />;
};

export const NewsRecapContent = ({ recap }: { recap: WeeklyRecapData }) => {
    const cardsQuery = useCardsQuery({ includeNonCollectible: true });

    if (cardsQuery.isLoading) return <CenteredLoader />;

    const cardsById = new Map((cardsQuery.data ?? []).map((card) => [card.id, card]));
    const hasNewCards = recap.newCardIds.length > 0;
    const hasBuffs = recap.buffs.length > 0;
    const hasNerfs = recap.nerfs.length > 0;

    return (
        <>
            <p>
                Récapitulatif hebdomadaire des changements de cartes détectés dans l&apos;historique
                du jeu.
            </p>

            {hasNewCards && (
                <section className="news-recap-section">
                    <h2 className="news-recap-section__title">Nouvelles cartes</h2>
                    <div className="gg-catalog-grid news-recap-grid">
                        {recap.newCardIds.map((cardId) => (
                            <NewsRecapCardById key={cardId} cardId={cardId} cardsById={cardsById} />
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

            {!hasNewCards && !hasBuffs && !hasNerfs && (
                <p className="news-recap-empty">Aucun changement de carte cette semaine.</p>
            )}
        </>
    );
};

export const createNewsRecapContent = (recap: WeeklyRecapData) => {
    const RecapContent = () => <NewsRecapContent recap={recap} />;
    return RecapContent;
};
