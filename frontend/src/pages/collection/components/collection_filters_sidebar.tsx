import { CARD_TAGS, CARD_TAG_LABELS, type CardTag } from "#api_types/card.types";
import { Tooltip } from "@mantine/core";
import clsx from "clsx";
import { CardTagSymbol } from "~/components/cards/card_tag_symbol";
import { CUELUME_TOGGLE } from "~/cuelume/sound_props";

interface CollectionFiltersSidebarProps {
    tagFilter: CardTag | null;
    onTagFilterChange: (tag: CardTag | null) => void;
    variant?: "sidebar" | "inline";
}

export const CollectionFiltersSidebar = ({
    tagFilter,
    onTagFilterChange,
    variant = "sidebar",
}: CollectionFiltersSidebarProps) => {
    const handleToggle = (tag: CardTag) => {
        onTagFilterChange(tagFilter === tag ? null : tag);
    };

    const isInline = variant === "inline";

    return (
        <aside
            className={clsx(
                "collection-filters-sidebar",
                isInline && "collection-filters-sidebar--inline",
            )}
            aria-label="Filtres par famille"
        >
            <span className="collection-filters-sidebar__label">
                {isInline ? "Filtres par famille" : "Filtres"}
            </span>
            <div className="collection-filters-sidebar__icons">
                {CARD_TAGS.map((tag) => {
                    const meta = CARD_TAG_LABELS[tag];
                    const isActive = tagFilter === tag;

                    return (
                        <Tooltip
                            key={tag}
                            label={meta.label}
                            withArrow
                            position={isInline ? "top" : "right"}
                        >
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
                                {...CUELUME_TOGGLE}
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
