interface DecksSidebarProps {
    deckCount: number;
    activeDeckName: string | null;
    totalCards: number;
    deckNameFilter: string;
    cardNameFilter: string;
    onDeckNameFilterChange: (value: string) => void;
    onCardNameFilterChange: (value: string) => void;
    onResetFilters: () => void;
}

export const DecksSidebar = ({
    deckCount,
    activeDeckName,
    totalCards,
    deckNameFilter,
    cardNameFilter,
    onDeckNameFilterChange,
    onCardNameFilterChange,
    onResetFilters,
}: DecksSidebarProps) => {
    const hasActiveFilters = deckNameFilter.length > 0 || cardNameFilter.length > 0;

    return (
        <aside className="decks-sidebar">
            <div className="decks-sidebar__header">Bibliothèque de Decks</div>
            <div className="decks-sidebar__body">
                <div className="decks-sidebar__stats">
                    <div className="decks-sidebar__stat">
                        <span className="decks-sidebar__stat-label">Decks possédés</span>
                        <span className="decks-sidebar__stat-value">{deckCount}</span>
                    </div>
                    <div className="decks-sidebar__stat">
                        <span className="decks-sidebar__stat-label">Deck actif</span>
                        <span
                            className={`decks-sidebar__stat-value${activeDeckName ? " decks-sidebar__stat-value--active" : ""}`}
                        >
                            {activeDeckName ?? "—"}
                        </span>
                    </div>
                    <div className="decks-sidebar__stat">
                        <span className="decks-sidebar__stat-label">Cartes totales</span>
                        <span className="decks-sidebar__stat-value">{totalCards}</span>
                    </div>
                    <div className="decks-sidebar__stat">
                        <span className="decks-sidebar__stat-label">Créés par vous</span>
                        <span className="decks-sidebar__stat-value">{deckCount}</span>
                    </div>
                </div>

                <div>
                    <h3 className="decks-sidebar__section-title">Filtres</h3>
                    <div className="decks-sidebar__filters">
                        <input
                            type="search"
                            className="decks-sidebar__input"
                            placeholder="Nom du deck"
                            value={deckNameFilter}
                            onChange={(e) => onDeckNameFilterChange(e.target.value)}
                            aria-label="Filtrer par nom de deck"
                        />
                        <input
                            type="search"
                            className="decks-sidebar__input"
                            placeholder="Nom de carte"
                            value={cardNameFilter}
                            onChange={(e) => onCardNameFilterChange(e.target.value)}
                            aria-label="Filtrer par nom de carte"
                        />
                        <button
                            type="button"
                            className="decks-sidebar__reset-btn"
                            onClick={onResetFilters}
                            disabled={!hasActiveFilters}
                        >
                            Réinitialiser les filtres
                        </button>
                    </div>
                </div>
            </div>
        </aside>
    );
};
