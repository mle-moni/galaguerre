import type { ApiCatalogCard } from "#api_types/deck.types";
import { type KeyboardEvent, useMemo } from "react";
import { computeManaCurve } from "~/utils/compute_mana_curve";

interface ManaCurveChartProps {
    composition: Map<number, number>;
    catalogById: Map<number, ApiCatalogCard>;
    selectedCost: number | null;
    onCostClick: (cost: number | null) => void;
}

const BAR_AREA_HEIGHT = 80;

const formatTooltip = (bucket: {
    minion: number;
    spell: number;
    weapon: number;
    total: number;
}): string => {
    if (bucket.total === 0) return "Aucune carte";
    const parts: string[] = [];
    if (bucket.minion > 0) {
        parts.push(`${bucket.minion} monstre${bucket.minion > 1 ? "s" : ""}`);
    }
    if (bucket.spell > 0) {
        parts.push(`${bucket.spell} sort${bucket.spell > 1 ? "s" : ""}`);
    }
    if (bucket.weapon > 0) {
        parts.push(`${bucket.weapon} arme${bucket.weapon > 1 ? "s" : ""}`);
    }
    return parts.join(", ");
};

const buildAriaLabel = (
    buckets: ReturnType<typeof computeManaCurve>["buckets"],
    averageCost: number,
    totalCards: number,
): string => {
    const distribution = buckets
        .filter((b) => b.total > 0)
        .map((b) => `${b.total} à ${b.cost} mana`)
        .join(", ");
    return `Courbe de mana : ${totalCards} cartes, moyenne ${averageCost.toFixed(1)} mana${distribution ? `, répartition : ${distribution}` : ""}`;
};

export const ManaCurveChart = ({
    composition,
    catalogById,
    selectedCost,
    onCostClick,
}: ManaCurveChartProps) => {
    const { buckets, maxCount, averageCost, totalCards } = useMemo(
        () => computeManaCurve(composition, catalogById),
        [composition, catalogById],
    );

    const ariaLabel = buildAriaLabel(buckets, averageCost, totalCards);

    if (totalCards === 0) {
        return (
            <div className="gg-mana-curve gg-mana-curve--empty">
                <p className="text-white/50 text-xs m-0 text-center">
                    Ajoutez des cartes pour voir la courbe
                </p>
            </div>
        );
    }

    const handleColumnClick = (cost: number) => {
        onCostClick(selectedCost === cost ? null : cost);
    };

    const handleColumnKeyDown = (e: KeyboardEvent, cost: number) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleColumnClick(cost);
        }
    };

    return (
        <div className="gg-mana-curve" role="img" aria-label={ariaLabel}>
            <div className="gg-mana-curve__bars">
                {buckets.map((bucket) => {
                    const isActive = selectedCost === bucket.cost;
                    const totalHeight =
                        bucket.total > 0
                            ? Math.max(4, (bucket.total / maxCount) * BAR_AREA_HEIGHT)
                            : 0;
                    const segmentHeight = (count: number) =>
                        bucket.total > 0 ? (count / bucket.total) * totalHeight : 0;

                    return (
                        <button
                            key={bucket.cost}
                            type="button"
                            className={`gg-mana-curve__column ${isActive ? "gg-mana-curve__column--active" : ""}`}
                            onClick={() => handleColumnClick(bucket.cost)}
                            onKeyDown={(e) => handleColumnKeyDown(e, bucket.cost)}
                            title={formatTooltip(bucket)}
                            aria-label={`${bucket.cost} mana : ${formatTooltip(bucket)}`}
                            aria-pressed={isActive}
                        >
                            {bucket.total > 0 && (
                                <span className="gg-mana-curve__count">{bucket.total}</span>
                            )}
                            <div
                                className="gg-mana-curve__stack"
                                style={{ height: `${BAR_AREA_HEIGHT}px` }}
                            >
                                {bucket.minion > 0 && (
                                    <div
                                        className="gg-mana-curve__segment gg-mana-curve__segment--minion"
                                        style={{ height: `${segmentHeight(bucket.minion)}px` }}
                                    />
                                )}
                                {bucket.spell > 0 && (
                                    <div
                                        className="gg-mana-curve__segment gg-mana-curve__segment--spell"
                                        style={{ height: `${segmentHeight(bucket.spell)}px` }}
                                    />
                                )}
                                {bucket.weapon > 0 && (
                                    <div
                                        className="gg-mana-curve__segment gg-mana-curve__segment--weapon"
                                        style={{ height: `${segmentHeight(bucket.weapon)}px` }}
                                    />
                                )}
                            </div>
                            <span
                                className={`gg-mana-curve__gem ${isActive ? "gg-mana-curve__gem--active" : ""}`}
                            >
                                {bucket.cost}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="gg-mana-curve__footer">
                <span className="gg-mana-curve__avg">Moyenne : {averageCost.toFixed(1)} mana</span>
                <div className="gg-mana-curve__legend" aria-hidden="true">
                    <span className="gg-mana-curve__legend-item">
                        <span className="gg-mana-curve__legend-dot gg-mana-curve__legend-dot--minion" />
                        Monstres
                    </span>
                    <span className="gg-mana-curve__legend-item">
                        <span className="gg-mana-curve__legend-dot gg-mana-curve__legend-dot--spell" />
                        Sorts
                    </span>
                    <span className="gg-mana-curve__legend-item">
                        <span className="gg-mana-curve__legend-dot gg-mana-curve__legend-dot--weapon" />
                        Armes
                    </span>
                </div>
            </div>
        </div>
    );
};
