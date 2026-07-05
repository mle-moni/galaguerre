import type { ApiCatalogCard } from "#api_types/deck.types";
import { getGoldCoinsPerCardBuy, getGoldCoinsPerDuplicateSell } from "#api_types/card_rarity.types";
import { CARD_TAG_LABELS, type CardTag } from "#api_types/card.types";
import { Button, Collapse, SegmentedControl, Select, TextInput, Tooltip } from "@mantine/core";
import {
    IconChevronDown,
    IconChevronUp,
    IconMinus,
    IconPlus,
    IconSearch,
    IconShield,
} from "@tabler/icons-react";
import clsx from "clsx";
import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";
import { CardArtworkModal } from "~/components/cards/card_artwork_modal";
import { CardRarityBadge } from "~/components/cards/card_legendary_badge";
import { CatalogCardDisplay } from "~/components/cards/catalog_card_display";
import { CatalogCardHoverPreview } from "~/components/cards/catalog_card_hover_preview";
import { CenteredLoader } from "~/components/centered_loader";
import { BuyCardModal } from "~/components/catalogue/buy_card_modal";
import { SellCardModal } from "~/components/catalogue/sell_card_modal";
import { CollectionFiltersSidebar } from "~/pages/collection/components/collection_filters_sidebar";
import { useCardSetsQuery } from "~/hooks/use_card_sets";
import { useCardsQuery } from "~/hooks/use_cards";
import { useIsMobilePortrait } from "~/hooks/use_is_mobile_portrait";
import { useIsNarrowScreen } from "~/hooks/use_is_narrow_screen";

type CardTypeFilter = "ALL" | "MINION" | "SPELL" | "WEAPON";

const CARD_TYPE_FILTER_LABELS: Record<Exclude<CardTypeFilter, "ALL">, string> = {
    MINION: "Monstres",
    SPELL: "Sorts",
    WEAPON: "Armes",
};

const normalizeForSearch = (value: string) =>
    value
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "");

const cardMatchesSearch = (card: ApiCatalogCard, query: string) => {
    const normalizedQuery = normalizeForSearch(query);
    if (normalizeForSearch(card.label).includes(normalizedQuery)) return true;
    if (normalizeForSearch(card.description).includes(normalizedQuery)) return true;
    return card.tags.some((tag) =>
        normalizeForSearch(CARD_TAG_LABELS[tag].label).includes(normalizedQuery),
    );
};

export interface CatalogueProps {
    className?: string;
    variant?: "default" | "collection" | "deckBuilder";
    headerTitle?: string | false;
    includeNonCollectible?: boolean;
    composition?: Map<number, number>;
    canAddCard?: (cardId: number) => boolean;
    onAdd?: (cardId: number) => void;
    onRemove?: (cardId: number) => void;
    costFilter?: string | null;
    onCostFilterChange?: (cost: string | null) => void;
    ownedCounts?: Map<number, number>;
    ownedOnly?: boolean;
    showOwnedOnly?: boolean;
    onShowOwnedOnlyChange?: (value: boolean) => void;
    canBuyCard?: (cardId: number) => boolean;
    onBuyCard?: (cardId: number) => void | Promise<void>;
    buyingCardId?: number | null;
    canSellCard?: (cardId: number) => boolean;
    onSellCard?: (cardId: number) => void | Promise<void>;
    sellingCardId?: number | null;
    userGoldCoins?: number;
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
    showOwnedCount: boolean;
    canBuy: boolean;
    onBuy?: () => void;
    canSell: boolean;
    onSell?: () => void;
}

const catalogueOwnershipFilterStyles = {
    root: {
        backgroundColor: "white",
        border: "1px solid var(--mantine-color-gray-4)",
        padding: 4,
        height: 36,
        boxSizing: "border-box" as const,
        alignItems: "center",
    },
    label: {
        fontWeight: 600,
        fontSize: 14,
        lineHeight: "26px",
        padding: "0 12px",
        color: "#1e3a5f",
    },
    indicator: {
        backgroundColor: "#f0b840",
        boxShadow: "none",
    },
};

const collectionOwnershipFilterStyles = {
    root: {
        backgroundColor: "rgba(255, 255, 255, 0.75)",
        border: "1px solid rgba(201, 162, 39, 0.55)",
        padding: 4,
        height: 36,
        boxSizing: "border-box" as const,
        alignItems: "center",
    },
    label: {
        fontWeight: 700,
        fontSize: 11,
        lineHeight: "26px",
        padding: "0 10px",
        color: "#2c2416",
        letterSpacing: "0.04em",
        textTransform: "uppercase" as const,
    },
    indicator: {
        backgroundColor: "#1a4a8a",
        boxShadow: "none",
    },
};

const OwnedCountBadge = ({ count }: { count: number }) => {
    if (count <= 1) return null;

    return (
        <Tooltip label="Nombre d'exemplaires possédés" withArrow>
            <span className="gg-catalog-card-slot__count gg-catalog-card-slot__count--owned">
                x{count}
            </span>
        </Tooltip>
    );
};

const CatalogRarityBadge = ({
    rarity,
}: { rarity: Exclude<ApiCatalogCard["rarity"], "COMMON"> }) => (
    <CardRarityBadge rarity={rarity} className="gg-catalog-card-slot__rarity" />
);

const CatalogTradeButtons = ({
    cardLabel,
    canBuy,
    onBuy,
    canSell,
    onSell,
    variant,
}: {
    cardLabel: string;
    canBuy: boolean;
    onBuy?: () => void;
    canSell: boolean;
    onSell?: () => void;
    variant: "grid" | "list";
}) => {
    if (!canBuy && !canSell) return null;

    if (variant === "list") {
        return (
            <div className="gg-composition-row__actions">
                <div className="gg-composition-row__controls">
                    {canSell && onSell && (
                        <Button
                            size="sm"
                            variant="outline"
                            color="gold"
                            onClick={onSell}
                            aria-label={`Vendre ${cardLabel}`}
                        >
                            💰
                        </Button>
                    )}
                    {canBuy && onBuy && (
                        <Button
                            size="sm"
                            variant="outline"
                            color="gold"
                            onClick={onBuy}
                            aria-label={`Acheter ${cardLabel}`}
                        >
                            🛒
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="gg-catalog-card-slot__trade-actions">
            {canSell && onSell && (
                <Tooltip label="Vendre" withArrow>
                    <button
                        type="button"
                        className="gg-catalog-card-slot__action gg-catalog-card-slot__action--sell"
                        aria-label={`Vendre ${cardLabel}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onSell();
                        }}
                    >
                        💰
                    </button>
                </Tooltip>
            )}
            {canBuy && onBuy && (
                <Tooltip label="Acheter" withArrow>
                    <button
                        type="button"
                        className="gg-catalog-card-slot__action gg-catalog-card-slot__action--buy"
                        aria-label={`Acheter ${cardLabel}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onBuy();
                        }}
                    >
                        🛒
                    </button>
                </Tooltip>
            )}
        </div>
    );
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
    showOwnedCount,
    canBuy,
    onBuy,
    canSell,
    onSell,
}: CatalogCardItemProps) => {
    const thumbOpensArtworkModal = !interactive && !isMobilePortrait;
    const isUnowned = ownedCount !== null && ownedCount === 0;
    const showOwnedBadge = ownedCount !== null && ownedCount > 0 && showOwnedCount;
    if (isNarrowScreen) {
        return (
            <div className={clsx("gg-composition-row", isUnowned && "gg-composition-row--unowned")}>
                <div className="gg-composition-row__thumb-wrap">
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
                        <CatalogCardHoverPreview card={card}>
                            <CatalogCardDisplay
                                card={card}
                                variant="artwork"
                                overlay={
                                    <>
                                        {card.rarity !== "COMMON" && (
                                            <CatalogRarityBadge rarity={card.rarity} />
                                        )}
                                        {showOwnedBadge && <OwnedCountBadge count={ownedCount} />}
                                    </>
                                }
                            />
                        </CatalogCardHoverPreview>
                    </div>
                    {interactive && count > 0 && (
                        <span className="gg-catalog-card-slot__count">{count}</span>
                    )}
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
                {!interactive && (
                    <CatalogTradeButtons
                        cardLabel={card.label}
                        canBuy={canBuy}
                        onBuy={onBuy}
                        canSell={canSell}
                        onSell={onSell}
                        variant="list"
                    />
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
                <CatalogCardDisplay
                    card={card}
                    copyCount={showOwnedBadge ? ownedCount : undefined}
                />
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
            {!interactive && (
                <CatalogTradeButtons
                    cardLabel={card.label}
                    canBuy={canBuy}
                    onBuy={onBuy}
                    canSell={canSell}
                    onSell={onSell}
                    variant="grid"
                />
            )}
        </div>
    );
};

export const Catalogue = observer(
    ({
        className,
        variant = "default",
        headerTitle = "Catalogue",
        includeNonCollectible = false,
        composition,
        canAddCard,
        onAdd,
        onRemove,
        costFilter: controlledCostFilter,
        onCostFilterChange,
        ownedCounts,
        ownedOnly = false,
        showOwnedOnly = false,
        onShowOwnedOnlyChange,
        canBuyCard,
        onBuyCard,
        buyingCardId = null,
        canSellCard,
        onSellCard,
        sellingCardId = null,
        userGoldCoins = 0,
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
        const [buyModalCard, setBuyModalCard] = useState<ApiCatalogCard | null>(null);
        const [sellModalCard, setSellModalCard] = useState<ApiCatalogCard | null>(null);
        const [showFilters, setShowFilters] = useState(false);
        const [tagFilter, setTagFilter] = useState<CardTag | null>(null);

        const isCollection = variant === "collection";
        const isDeckBuilder = variant === "deckBuilder";
        const isLightCatalogue = isCollection || isDeckBuilder;
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
            if (tagFilter !== null && !card.tags.includes(tagFilter)) return false;
            if ((ownedOnly || showOwnedOnly) && (ownedCounts?.get(card.id) ?? 0) === 0) {
                return false;
            }
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

        const ownershipFilterStyles = isLightCatalogue
            ? collectionOwnershipFilterStyles
            : catalogueOwnershipFilterStyles;

        const filterControls = isLightCatalogue ? (
            <div className="collection-catalogue__filters">
                <Select
                    value={selectedSetId ?? ""}
                    onChange={(value) => setSelectedSetId(value || null)}
                    data={cardSetOptions}
                    className="collection-catalogue__set-select"
                    leftSection={<IconShield size={16} color="#1a4a8a" />}
                    disabled={cardSetOptions.length === 0}
                />
                <TextInput
                    placeholder="Rechercher une carte..."
                    value={search}
                    onChange={(e) => setSearch(e.currentTarget.value)}
                    className="collection-catalogue__search"
                    leftSection={<IconSearch size={16} color="rgba(44, 36, 22, 0.45)" />}
                />
                <Select
                    value={typeFilter}
                    onChange={(v) => setTypeFilter((v as CardTypeFilter) ?? "ALL")}
                    data={[
                        { value: "ALL", label: "Tous types" },
                        { value: "MINION", label: CARD_TYPE_FILTER_LABELS.MINION },
                        { value: "SPELL", label: CARD_TYPE_FILTER_LABELS.SPELL },
                        { value: "WEAPON", label: CARD_TYPE_FILTER_LABELS.WEAPON },
                    ]}
                    className="collection-catalogue__type-select"
                />
                <Select
                    value={costFilter ?? ""}
                    onChange={(v) => setCostFilter(v || null)}
                    data={costOptions}
                    className="collection-catalogue__cost-select"
                />
                {ownedCounts !== undefined && onShowOwnedOnlyChange && !ownedOnly && (
                    <SegmentedControl
                        value={showOwnedOnly ? "owned" : "all"}
                        onChange={(value) => onShowOwnedOnlyChange(value === "owned")}
                        data={[
                            { value: "all", label: "Toutes" },
                            { value: "owned", label: "Possédées" },
                        ]}
                        className="collection-catalogue__ownership"
                        styles={ownershipFilterStyles}
                    />
                )}
            </div>
        ) : (
            <div className="flex flex-wrap gap-3 items-end">
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
                        { value: "MINION", label: CARD_TYPE_FILTER_LABELS.MINION },
                        { value: "SPELL", label: CARD_TYPE_FILTER_LABELS.SPELL },
                        { value: "WEAPON", label: CARD_TYPE_FILTER_LABELS.WEAPON },
                    ]}
                    className="w-full sm:w-[140px]"
                />
                <Select
                    value={costFilter ?? ""}
                    onChange={(v) => setCostFilter(v || null)}
                    data={costOptions}
                    className="w-full sm:w-[160px]"
                />
                {ownedCounts !== undefined && onShowOwnedOnlyChange && !ownedOnly && (
                    <SegmentedControl
                        value={showOwnedOnly ? "owned" : "all"}
                        onChange={(value) => onShowOwnedOnlyChange(value === "owned")}
                        data={[
                            { value: "all", label: "Toutes" },
                            { value: "owned", label: "Possédées" },
                        ]}
                        className="w-full sm:w-auto"
                        styles={ownershipFilterStyles}
                    />
                )}
            </div>
        );

        const showTradeActions =
            (canBuyCard !== undefined && onBuyCard !== undefined) ||
            (canSellCard !== undefined && onSellCard !== undefined);

        const gridContent =
            filteredCatalog.length === 0 ? (
                <p
                    className={
                        isLightCatalogue
                            ? "collection-catalogue__empty"
                            : "text-white/50 text-sm m-0 w-full text-center py-8"
                    }
                >
                    Aucune carte ne correspond à vos filtres.
                </p>
            ) : (
                filteredCatalog.map((card) => {
                    const canBuy = showTradeActions && (canBuyCard?.(card.id) ?? false);
                    const canSell = showTradeActions && (canSellCard?.(card.id) ?? false);

                    return (
                        <CatalogCardItem
                            key={card.id}
                            card={card}
                            count={composition?.get(card.id) ?? 0}
                            ownedCount={
                                ownedCounts === undefined ? null : ownedCounts.get(card.id) ?? 0
                            }
                            interactive={interactive}
                            canAdd={canAddCard?.(card.id) ?? false}
                            onAdd={onAdd ? () => onAdd(card.id) : undefined}
                            onRemove={onRemove ? () => onRemove(card.id) : undefined}
                            onViewArtwork={() => setArtworkCard(card)}
                            isNarrowScreen={isNarrowScreen}
                            isMobilePortrait={isMobilePortrait}
                            showOwnedCount={ownedOnly || !interactive}
                            canBuy={canBuy}
                            onBuy={canBuy ? () => setBuyModalCard(card) : undefined}
                            canSell={canSell}
                            onSell={canSell ? () => setSellModalCard(card) : undefined}
                        />
                    );
                })
            );

        const filtersSection = isNarrowScreen ? (
            <>
                <button
                    type="button"
                    className={
                        isLightCatalogue
                            ? "collection-catalogue__filters-toggle"
                            : "gg-mana-curve-toggle"
                    }
                    onClick={() => setShowFilters((visible) => !visible)}
                    aria-expanded={showFilters}
                >
                    <span className="truncate min-w-0 flex-1 text-left">Filtres</span>
                    {showFilters ? (
                        <IconChevronUp size={16} aria-hidden />
                    ) : (
                        <IconChevronDown size={16} aria-hidden />
                    )}
                </button>
                <Collapse in={showFilters}>
                    <div className="pt-1">{filterControls}</div>
                </Collapse>
            </>
        ) : (
            filterControls
        );

        if (isLightCatalogue) {
            return (
                <>
                    <div className={clsx("collection-catalogue", className)}>
                        <div className="collection-catalogue__body">
                            <div className="shrink-0">{filtersSection}</div>
                            <div
                                className={clsx(
                                    "collection-catalogue__main",
                                    isDeckBuilder && "collection-catalogue__main--no-sidebar",
                                )}
                            >
                                {isCollection && (
                                    <CollectionFiltersSidebar
                                        tagFilter={tagFilter}
                                        onTagFilterChange={setTagFilter}
                                    />
                                )}
                                <div
                                    className={
                                        isNarrowScreen
                                            ? "collection-catalogue__grid gg-catalog-grid--list"
                                            : "collection-catalogue__grid"
                                    }
                                >
                                    {gridContent}
                                </div>
                            </div>
                        </div>
                    </div>

                    <CardArtworkModal
                        card={artworkCard}
                        opened={artworkCard !== null}
                        onClose={() => setArtworkCard(null)}
                    />

                    {isCollection && (
                        <>
                            <BuyCardModal
                                card={buyModalCard}
                                price={
                                    buyModalCard
                                        ? getGoldCoinsPerCardBuy(buyModalCard.rarity)
                                        : null
                                }
                                userGoldCoins={userGoldCoins}
                                opened={buyModalCard !== null}
                                onClose={() => setBuyModalCard(null)}
                                onConfirm={async () => {
                                    if (!buyModalCard || !onBuyCard) return;
                                    await onBuyCard(buyModalCard.id);
                                    setBuyModalCard(null);
                                }}
                                isBuying={buyingCardId === buyModalCard?.id}
                            />

                            <SellCardModal
                                card={sellModalCard}
                                price={
                                    sellModalCard
                                        ? getGoldCoinsPerDuplicateSell(sellModalCard.rarity)
                                        : null
                                }
                                userGoldCoins={userGoldCoins}
                                opened={sellModalCard !== null}
                                onClose={() => setSellModalCard(null)}
                                onConfirm={async () => {
                                    if (!sellModalCard || !onSellCard) return;
                                    await onSellCard(sellModalCard.id);
                                    setSellModalCard(null);
                                }}
                                isSelling={sellingCardId === sellModalCard?.id}
                            />
                        </>
                    )}
                </>
            );
        }

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
                        <div className="shrink-0 mb-4">{filtersSection}</div>
                        <div
                            className={
                                isNarrowScreen
                                    ? "gg-catalog-grid gg-catalog-grid--list"
                                    : "gg-catalog-grid"
                            }
                        >
                            {gridContent}
                        </div>
                    </div>
                </div>

                <CardArtworkModal
                    card={artworkCard}
                    opened={artworkCard !== null}
                    onClose={() => setArtworkCard(null)}
                />

                <BuyCardModal
                    card={buyModalCard}
                    price={buyModalCard ? getGoldCoinsPerCardBuy(buyModalCard.rarity) : null}
                    userGoldCoins={userGoldCoins}
                    opened={buyModalCard !== null}
                    onClose={() => setBuyModalCard(null)}
                    onConfirm={async () => {
                        if (!buyModalCard || !onBuyCard) return;
                        await onBuyCard(buyModalCard.id);
                        setBuyModalCard(null);
                    }}
                    isBuying={buyingCardId === buyModalCard?.id}
                />

                <SellCardModal
                    card={sellModalCard}
                    price={
                        sellModalCard ? getGoldCoinsPerDuplicateSell(sellModalCard.rarity) : null
                    }
                    userGoldCoins={userGoldCoins}
                    opened={sellModalCard !== null}
                    onClose={() => setSellModalCard(null)}
                    onConfirm={async () => {
                        if (!sellModalCard || !onSellCard) return;
                        await onSellCard(sellModalCard.id);
                        setSellModalCard(null);
                    }}
                    isSelling={sellingCardId === sellModalCard?.id}
                />
            </>
        );
    },
);
