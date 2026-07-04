import { CARD_TAGS, CARD_TAG_LABELS, type CardTag } from "#api_types/card.types";
import { Tooltip } from "@mantine/core";
import clsx from "clsx";
import { CardTagSymbol } from "~/components/cards/card_tag_symbol";

interface CollectionFiltersSidebarProps {
    tagFilter: CardTag | null;
    onTagFilterChange: (tag: CardTag | null) => void;
}

export const CollectionFiltersSidebar = ({
    tagFilter,
    onTagFilterChange,
}: CollectionFiltersSidebarProps) => {
    const handleToggle = (tag: CardTag) => {
        onTagFilterChange(tagFilter === tag ? null : tag);
    };

    return (
        <aside className="collection-filters-sidebar" aria-label="Filtres par famille">
            <span className="collection-filters-sidebar__label">Filtres</span>
            <div className="collection-filters-sidebar__icons">
                {CARD_TAGS.map((tag) => {
                    const meta = CARD_TAG_LABELS[tag];
                    const isActive = tagFilter === tag;

                    return (
                        <Tooltip key={tag} label={meta.label} withArrow position="right">
                            <button
                                type="button"
                                className={clsx(
                                    "collection-filters-sidebar__icon-btn",
                                    isActive && "collection-filters-sidebar__icon-btn--active",
                                )}
                                aria-label={`Filtrer par ${meta.label}`}
                                aria-pressed={isActive}
                                onClick={() => handleToggle(tag)}
                                style={{ backgroundColor: meta.backgroundColor }}
                            >
                                <CardTagSymbol symbol={meta.symbol} size={20} />
                            </button>
                        </Tooltip>
                    );
                })}
            </div>
        </aside>
    );
};
