import type { ApiCatalogCard } from "#api_types/deck.types";
import { CARD_TAG_LABELS } from "#api_types/card.types";
import { Button, NumberInput, Select, Switch, TextInput } from "@mantine/core";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import clsx from "clsx";
import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";
import { CardArtworkModal } from "~/components/cards/card_artwork_modal";
import { CatalogCardDisplay } from "~/components/cards/catalog_card_display";
import { CatalogCardHoverPreview } from "~/components/cards/catalog_card_hover_preview";
import { CenteredLoader } from "~/components/centered_loader";
import { useCardSetsQuery } from "~/hooks/use_card_sets";
import { useCardsQuery } from "~/hooks/use_cards";
import { useIsMobilePortrait } from "~/hooks/use_is_mobile_portrait";
import { useIsNarrowScreen } from "~/hooks/use_is_narrow_screen";

type CardTypeFilter = "ALL" | "MINION" | "SPELL" | "WEAPON";

const normalizeForSearch = (value: string) =>
    value
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "");

const cardMatchesSearch = (card: ApiCatalogCard, query: string) => {
    const normalizedQuery = normalizeForSearch(query);
    if (normalizeForSearch(card.label).includes(normalizedQuery)) return true;
    return card.tags.some((tag) =>
        normalizeForSearch(CARD_TAG_LABELS[tag].label).includes(normalizedQuery),
    );
};

export interface CatalogueProps {
    className?: string;
    headerTitle?: string | false;
    includeNonCollectible?: boolean;
    composition?: Map<number, number>;
    canAddCard?: (cardId: number) => boolean;
    onAdd?: (cardId: number) => void;
    onRemove?: (cardId: number) => void;
    costFilter?: string | null;
    onCostFilterChange?: (cost: string | null) => void;
    ownedCounts?: Map<number, number>;
    showOwnedOnly?: boolean;
    onShowOwnedOnlyChange?: (value: boolean) => void;
}

interface CatalogCardItemProps {
    card: ApiCatalogCard;
    count: number;
    ownedCount: number | null;
    interactive: boolean;
    canAdd: boolean;
    onAdd?: () => void;
    onRemove?: () => void;
    onViewArtwork: () => void;
    isNarrowScreen: boolean;
    isMobilePortrait: boolean;
}

const catalogRowControlsInputStyles = {
    input: {
        textAlign: "center" as const,
        height: 36,
        minHeight: 36,
    },
};

const CatalogCardItem = ({
    card,
    count,
    ownedCount,
    interactive,
    canAdd,
    onAdd,
    onRemove,
    onViewArtwork,
    isNarrowScreen,
    isMobilePortrait,
}: CatalogCardItemProps) => {
    const thumbOpensArtworkModal = !interactive && !isMobilePortrait;
    const isUnowned = ownedCount !== null && ownedCount === 0;
    const showOwnedBadge = ownedCount !== null && ownedCount > 0 && !interactive;

    if (isNarrowScreen) {
        return (
            <div className={clsx("gg-composition-row", isUnowned && "gg-composition-row--unowned")}>
                <div className="gg-composition-row__thumb-wrap">
                    <CatalogCardHoverPreview card={card}>
                        <div
                            className="gg-composition-row__thumb card-composition"
                            onClick={thumbOpensArtworkModal ? onViewArtwork : undefined}
                            role={thumbOpensArtworkModal ? "button" : undefined}
                            tabIndex={thumbOpensArtworkModal ? 0 : undefined}
                            onKeyDown={
                                thumbOpensArtworkModal
                                    ? (e) => {
                                          if (e.key === "Enter" || e.key === " ") {
                                              e.preventDefault();
                                              onViewArtwork();
                                          }
                                      }
                                    : undefined
                            }
                        >
                            <CatalogCardDisplay card={card} variant="artwork" />
                        </div>
                    </CatalogCardHoverPreview>
                </div>
                {interactive && (
                    <div className="gg-composition-row__actions">
                        <div className="gg-composition-row__controls">
                            {count > 0 && onRemove && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    color="gold"
                                    onClick={onRemove}
                                    aria-label={`Retirer ${card.label} du deck`}
                                >
                                    <IconMinus size={14} />
                                </Button>
                            )}
                            {count > 0 && (
                                <NumberInput
                                    value={count}
                                    readOnly
                                    hideControls
                                    className="w-14"
                                    styles={catalogRowControlsInputStyles}
                                />
                            )}
                            {canAdd && onAdd && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    color="gold"
                                    onClick={onAdd}
                                    aria-label={`Ajouter ${card.label} au deck`}
                                >
                                    <IconPlus size={14} />
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={clsx("gg-catalog-card-slot", isUnowned && "gg-catalog-card-slot--unowned")}>
            <div
                className="gg-catalog-card-slot__preview"
                onClick={onViewArtwork}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onViewArtwork();
                    }
                }}
            >
                <CatalogCardDisplay card={card} />
            </div>
            {interactive && count > 0 && onRemove && (
                <button
                    type="button"
                    className="gg-catalog-card-slot__action gg-catalog-card-slot__action--remove"
                    aria-label={`Retirer ${card.label} du deck`}
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                >
                    <IconMinus size={16} stroke={2.5} />
                </button>
            )}
            {interactive && canAdd && onAdd && (
                <button
                    type="button"
                    className="gg-catalog-card-slot__action gg-catalog-card-slot__action--add"
                    aria-label={`Ajouter ${card.label} au deck`}
                    onClick={(e) => {
                        e.stopPropagation();
                        onAdd();
                    }}
                >
                    <IconPlus size={16} stroke={2.5} />
                </button>
            )}
            {interactive && count > 0 && (
                <span className="gg-catalog-card-slot__count">{count}</span>
            )}
            {showOwnedBadge && <span className="gg-catalog-card-slot__count">×{ownedCount}</span>}
        </div>
    );
};

export const Catalogue = observer(
    ({
        className,
        headerTitle = "Catalogue",
        includeNonCollectible = false,
        composition,
        canAddCard,
        onAdd,
        onRemove,
        costFilter: controlledCostFilter,
        onCostFilterChange,
        ownedCounts,
        showOwnedOnly = false,
        onShowOwnedOnlyChange,
    }: CatalogueProps) => {
        const cardsQuery = useCardsQuery({ includeNonCollectible });
        const cardSetsQuery = useCardSetsQuery();
        const isNarrowScreen = useIsNarrowScreen();
        const isMobilePortrait = useIsMobilePortrait();

        const [search, setSearch] = useState("");
        const [typeFilter, setTypeFilter] = useState<CardTypeFilter>("ALL");
        const [internalCostFilter, setInternalCostFilter] = useState<string | null>(null);
        const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
        const [artworkCard, setArtworkCard] = useState<ApiCatalogCard | null>(null);

        const isControlledCostFilter = onCostFilterChange !== undefined;
        const costFilter = isControlledCostFilter
            ? controlledCostFilter ?? null
            : internalCostFilter;
        const setCostFilter = isControlledCostFilter ? onCostFilterChange : setInternalCostFilter;

        const interactive = onAdd !== undefined && onRemove !== undefined;
        const catalog = cardsQuery.data ?? [];
        const cardSets = cardSetsQuery.data ?? [];

        useEffect(() => {
            if (selectedSetId === null && cardSets[0]) {
                setSelectedSetId(String(cardSets[0].id));
            }
        }, [cardSets, selectedSetId]);

        if (cardsQuery.isLoading || cardSetsQuery.isLoading) {
            return <CenteredLoader />;
        }

        const filteredCatalog = catalog.filter((card) => {
            if (selectedSetId !== null && card.cardSetId !== Number(selectedSetId)) return false;
            if (search && !cardMatchesSearch(card, search)) return false;
            if (typeFilter !== "ALL" && card.type !== typeFilter) return false;
            if (costFilter !== null && card.cost !== Number(costFilter)) return false;
            if (showOwnedOnly && (ownedCounts?.get(card.id) ?? 0) === 0) return false;
            return true;
        });

        const costOptions = [
            { value: "", label: "Tous les coûts" },
            ...Array.from(new Set(catalog.map((c) => c.cost)))
                .sort((a, b) => a - b)
                .map((cost) => ({ value: String(cost), label: `${cost} mana` })),
        ];

        const cardSetOptions = cardSets.map((set) => ({
            value: String(set.id),
            label: set.name,
        }));

        return (
            <>
                <div
                    className={clsx(
                        "gg-panel flex flex-col flex-1 min-h-0 lg:h-full overflow-hidden",
                        className,
                    )}
                >
                    {headerTitle !== false && (
                        <div className="gg-panel-header shrink-0">{headerTitle}</div>
                    )}
                    <div className="gg-panel-body flex flex-col flex-1 min-h-0 overflow-hidden">
                        <div className="flex flex-wrap gap-3 items-end mb-4 shrink-0">
                            <Select
                                label="Set de cartes"
                                value={selectedSetId ?? ""}
                                onChange={(value) => setSelectedSetId(value || null)}
                                data={cardSetOptions}
                                className="w-full sm:w-[180px]"
                                styles={{ label: { color: "#1e3a5f", fontWeight: 600 } }}
                                disabled={cardSetOptions.length === 0}
                            />
                            <TextInput
                                placeholder="Rechercher une carte..."
                                value={search}
                                onChange={(e) => setSearch(e.currentTarget.value)}
                                className="w-full sm:flex-1 sm:min-w-[180px]"
                            />
                            <Select
                                value={typeFilter}
                                onChange={(v) => setTypeFilter((v as CardTypeFilter) ?? "ALL")}
                                data={[
                                    { value: "ALL", label: "Tous types" },
                                    { value: "MINION", label: "Serviteurs" },
                                    { value: "SPELL", label: "Sorts" },
                                    { value: "WEAPON", label: "Armes" },
                                ]}
                                className="w-full sm:w-[140px]"
                            />
                            <Select
                                value={costFilter ?? ""}
                                onChange={(v) => setCostFilter(v || null)}
                                data={costOptions}
                                className="w-full sm:w-[140px]"
                            />
                            {ownedCounts !== undefined && onShowOwnedOnlyChange && (
                                <Switch
                                    label="Cartes possédées uniquement"
                                    checked={showOwnedOnly}
                                    onChange={(e) => onShowOwnedOnlyChange(e.currentTarget.checked)}
                                    className="w-full sm:w-auto"
                                    styles={{ label: { color: "#1e3a5f", fontWeight: 600 } }}
                                />
                            )}
                        </div>
                        <div
                            className={
                                isNarrowScreen
                                    ? "gg-catalog-grid gg-catalog-grid--list"
                                    : "gg-catalog-grid"
                            }
                        >
                            {filteredCatalog.length === 0 ? (
                                <p className="text-white/50 text-sm m-0 w-full text-center py-8">
                                    Aucune carte ne correspond à vos filtres.
                                </p>
                            ) : (
                                filteredCatalog.map((card) => (
                                    <CatalogCardItem
                                        key={card.id}
                                        card={card}
                                        count={composition?.get(card.id) ?? 0}
                                        ownedCount={
                                            ownedCounts === undefined
                                                ? null
                                                : ownedCounts.get(card.id) ?? 0
                                        }
                                        interactive={interactive}
                                        canAdd={canAddCard?.(card.id) ?? false}
                                        onAdd={onAdd ? () => onAdd(card.id) : undefined}
                                        onRemove={onRemove ? () => onRemove(card.id) : undefined}
                                        onViewArtwork={() => setArtworkCard(card)}
                                        isNarrowScreen={isNarrowScreen}
                                        isMobilePortrait={isMobilePortrait}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <CardArtworkModal
                    card={artworkCard}
                    opened={artworkCard !== null}
                    onClose={() => setArtworkCard(null)}
                />
            </>
        );
    },
);
