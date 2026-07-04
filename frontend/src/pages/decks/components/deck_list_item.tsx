import type { CardTag } from "#api_types/card.types";
import { CARD_TAG_LABELS } from "#api_types/card.types";
import type { ApiCatalogCard, ApiDeck } from "#api_types/deck.types";
import { IconCrown, IconEdit, IconShare, IconTrash } from "@tabler/icons-react";
import clsx from "clsx";
import { Link } from "react-router-dom";
import { CardTagSymbol } from "~/components/cards/card_tag_symbol";
import { getDeckFeaturedCard } from "~/utils/get_deck_featured_card";

const DECK_PLACEHOLDER_IMAGE = "/card-covers/galadrim/question_mark.webp";

interface DeckListItemProps {
    deck: ApiDeck;
    catalogById: Map<number, ApiCatalogCard>;
    canDelete: boolean;
    isSelecting: boolean;
    onSelect: () => void;
    onShare: () => void;
    onDelete: () => void;
}

const getDeckTags = (deck: ApiDeck, catalogById: Map<number, ApiCatalogCard>): CardTag[] => {
    const tags = new Set<CardTag>();

    for (const { cardId } of deck.cards) {
        const card = catalogById.get(cardId);
        if (!card) continue;
        for (const tag of card.tags) {
            tags.add(tag);
        }
    }

    return [...tags];
};

export const DeckListItem = ({
    deck,
    catalogById,
    canDelete,
    isSelecting,
    onSelect,
    onShare,
    onDelete,
}: DeckListItemProps) => {
    const composition = new Map(deck.cards.map(({ cardId, count }) => [cardId, count] as const));
    const featuredCard = getDeckFeaturedCard(composition, catalogById);
    const deckTags = getDeckTags(deck, catalogById);

    return (
        <article className={clsx("deck-list-item", deck.selected && "deck-list-item--active")}>
            <div className="deck-list-item__portrait-wrap">
                <div className="deck-list-item__portrait">
                    <img
                        src={featuredCard?.imageUrl ?? DECK_PLACEHOLDER_IMAGE}
                        alt={
                            featuredCard
                                ? `Artwork de ${featuredCard.label}`
                                : "Aucune carte dans ce deck"
                        }
                    />
                </div>
            </div>

            <div className="deck-list-item__info">
                <div className="deck-list-item__title-row">
                    <h2 className="deck-list-item__name">{deck.name}</h2>
                    {deck.selected && (
                        <span className="deck-list-item__badge deck-list-item__badge--active">
                            Actif
                        </span>
                    )}
                    <span
                        className={clsx(
                            "deck-list-item__badge",
                            deck.valid
                                ? "deck-list-item__badge--valid"
                                : "deck-list-item__badge--invalid",
                        )}
                    >
                        {deck.valid ? "Valide" : "Invalide"}
                    </span>
                </div>
                <p className="deck-list-item__meta">{deck.cardCount} cartes</p>
                {!deck.valid && deck.compositionErrors.length > 0 && (
                    <p className="deck-list-item__error">{deck.compositionErrors[0]}</p>
                )}
                {deckTags.length > 0 && (
                    <div className="deck-list-item__tags">
                        {deckTags.map((tag) => (
                            <span
                                key={tag}
                                className="deck-list-item__tag"
                                style={{ backgroundColor: CARD_TAG_LABELS[tag].backgroundColor }}
                                title={CARD_TAG_LABELS[tag].label}
                            >
                                <CardTagSymbol symbol={CARD_TAG_LABELS[tag].symbol} size={16} />
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div className="deck-list-item__actions">
                {!deck.selected && (
                    <button
                        type="button"
                        className="deck-list-item__action-btn deck-list-item__action-btn--select"
                        disabled={!deck.valid || isSelecting}
                        onClick={onSelect}
                    >
                        <IconCrown size={14} />
                        Sélectionner
                    </button>
                )}
                <button
                    type="button"
                    className="deck-list-item__action-btn deck-list-item__action-btn--outline"
                    onClick={onShare}
                >
                    <IconShare size={14} />
                    Partager
                </button>
                <Link
                    to={`/decks/${deck.id}`}
                    className="deck-list-item__action-btn deck-list-item__action-btn--outline"
                >
                    <IconEdit size={14} />
                    Éditer
                </Link>
                <button
                    type="button"
                    className="deck-list-item__action-btn deck-list-item__action-btn--danger"
                    disabled={!canDelete}
                    onClick={onDelete}
                >
                    <IconTrash size={14} />
                    Supprimer
                </button>
            </div>
        </article>
    );
};
