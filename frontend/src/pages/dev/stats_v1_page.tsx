import type { ApiDevStatsV1Card } from "#api_types/dev_stats.types";
import { CARD_RARITY_LABELS } from "#api_types/card_rarity.types";
import clsx from "clsx";
import { useMemo, useState } from "react";
import { useDevStatsV1Query } from "~/hooks/use_dev_stats_v1";
import "./stats_v1_page.css";

type Mode = "human" | "ai";
type SortKey = "label" | "cost" | "liveSelectionRate" | "liveAvgCopies" | "playedGames" | "winrate";

const formatPct = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "—";
    return `${(value * 100).toFixed(1)}%`;
};

const formatCopies = (value: number | null) => {
    if (value === null) return "—";
    return value.toFixed(2);
};

const compareNullable = (a: number | null, b: number | null) => {
    if (a === null && b === null) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    return a - b;
};

export const StatsV1Page = () => {
    const query = useDevStatsV1Query();
    const [mode, setMode] = useState<Mode>("human");
    const [search, setSearch] = useState("");
    const [minGames, setMinGames] = useState(5);
    const [hideBelowMin, setHideBelowMin] = useState(true);
    const [sortKey, setSortKey] = useState<SortKey>("liveSelectionRate");
    const [sortAsc, setSortAsc] = useState(false);

    const cachedCards = query.data?.data?.cards;

    const rows = useMemo(() => {
        const cards = cachedCards ?? [];
        const needle = search.trim().toLowerCase();

        const filtered = cards.filter((card) => {
            if (
                needle &&
                !card.label.toLowerCase().includes(needle) &&
                !String(card.cardId).includes(needle)
            ) {
                return false;
            }
            const playedGames = card[mode].playedGames;
            if (hideBelowMin && playedGames < minGames) {
                return false;
            }
            return true;
        });

        const sorted = [...filtered].sort((a, b) => {
            const direction = sortAsc ? 1 : -1;
            let cmp = 0;
            switch (sortKey) {
                case "label":
                    cmp = a.label.localeCompare(b.label, "fr");
                    break;
                case "cost":
                    cmp = a.cost - b.cost;
                    break;
                case "liveSelectionRate":
                    cmp = a.liveSelectionRate - b.liveSelectionRate;
                    break;
                case "liveAvgCopies":
                    cmp = compareNullable(a.liveAvgCopies, b.liveAvgCopies);
                    break;
                case "playedGames":
                    cmp = a[mode].playedGames - b[mode].playedGames;
                    break;
                case "winrate":
                    cmp = compareNullable(a[mode].winrate, b[mode].winrate);
                    break;
            }
            return cmp * direction;
        });

        return sorted;
    }, [cachedCards, search, hideBelowMin, minGames, mode, sortKey, sortAsc]);

    const onSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortAsc(!sortAsc);
            return;
        }
        setSortKey(key);
        setSortAsc(key === "label");
    };

    const sortMarker = (key: SortKey) => {
        if (sortKey !== key) return "";
        return sortAsc ? " ↑" : " ↓";
    };

    if (query.isLoading) {
        return (
            <div className="stats-v1-page">
                <p className="stats-v1-page__intro">Chargement des stats…</p>
            </div>
        );
    }

    if (query.isError || !query.data) {
        return (
            <div className="stats-v1-page">
                <p className="stats-v1-page__intro">Échec du chargement des stats.</p>
            </div>
        );
    }

    const { status, nextRefreshAt, isRefreshing, data } = query.data;
    const nextRefreshLabel = new Date(nextRefreshAt).toLocaleString("fr-FR", {
        timeZone: "Europe/Paris",
    });

    if (status === "pending" || !data) {
        return (
            <div className="stats-v1-page">
                <h1 className="stats-v1-page__title">Stats cartes v1</h1>
                <p className="stats-v1-page__intro">
                    {isRefreshing
                        ? "Calcul en cours en arrière-plan (cache vide après démarrage)…"
                        : "Pas encore de snapshot en cache."}{" "}
                    Prochain refresh nocturne : {nextRefreshLabel} (Europe/Paris).
                </p>
            </div>
        );
    }

    const { meta } = data;

    return (
        <div className="stats-v1-page">
            <header className="stats-v1-page__header">
                <div>
                    <h1 className="stats-v1-page__title">Stats cartes v1</h1>
                    <p className="stats-v1-page__intro">
                        Page d&apos;équilibrage — URL secrète : <code>/dev/stats/v1</code>.
                        Sélection = decks live. Winrate = when-played. Snapshot mémoire recalculé
                        chaque nuit à 03:00 (Europe/Paris)
                        {isRefreshing ? " — refresh en cours…" : ""}. Généré le{" "}
                        {new Date(meta.generatedAt).toLocaleString("fr-FR", {
                            timeZone: "Europe/Paris",
                        })}
                        . Prochain : {nextRefreshLabel}.
                    </p>
                </div>
                <div className="stats-v1-page__meta">
                    <span>{meta.totalDecks} decks</span>
                    <span>{meta.humanGames} games humaines</span>
                    <span>{meta.aiGames} games IA</span>
                    <span>
                        scan {meta.gamesScanned}/{meta.gamesLimit}
                    </span>
                </div>
            </header>

            <div className="stats-v1-page__controls">
                <div className="stats-v1-page__tabs" role="tablist">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={mode === "human"}
                        className={clsx("stats-v1-page__tab", mode === "human" && "is-active")}
                        onClick={() => setMode("human")}
                    >
                        Humain
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={mode === "ai"}
                        className={clsx("stats-v1-page__tab", mode === "ai" && "is-active")}
                        onClick={() => setMode("ai")}
                    >
                        vs IA
                    </button>
                </div>

                <label className="stats-v1-page__field">
                    <span>Recherche</span>
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Nom ou id…"
                    />
                </label>

                <label className="stats-v1-page__field stats-v1-page__field--narrow">
                    <span>Min games</span>
                    <input
                        type="number"
                        min={0}
                        value={minGames}
                        onChange={(event) =>
                            setMinGames(Math.max(0, Number(event.target.value) || 0))
                        }
                    />
                </label>

                <label className="stats-v1-page__checkbox">
                    <input
                        type="checkbox"
                        checked={hideBelowMin}
                        onChange={(event) => setHideBelowMin(event.target.checked)}
                    />
                    Masquer sous le seuil
                </label>
            </div>

            <div className="stats-v1-page__table-wrap">
                <table className="stats-v1-page__table">
                    <thead>
                        <tr>
                            <th>
                                <button type="button" onClick={() => onSort("label")}>
                                    Carte{sortMarker("label")}
                                </button>
                            </th>
                            <th>
                                <button type="button" onClick={() => onSort("cost")}>
                                    Coût{sortMarker("cost")}
                                </button>
                            </th>
                            <th>Rareté</th>
                            <th>
                                <button type="button" onClick={() => onSort("liveSelectionRate")}>
                                    Sélection{sortMarker("liveSelectionRate")}
                                </button>
                            </th>
                            <th>
                                <button type="button" onClick={() => onSort("liveAvgCopies")}>
                                    Copies{sortMarker("liveAvgCopies")}
                                </button>
                            </th>
                            <th>
                                <button type="button" onClick={() => onSort("playedGames")}>
                                    Games{sortMarker("playedGames")}
                                </button>
                            </th>
                            <th>
                                <button type="button" onClick={() => onSort("winrate")}>
                                    Winrate{sortMarker("winrate")}
                                </button>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((card) => (
                            <StatsRow
                                key={card.cardId}
                                card={card}
                                mode={mode}
                                minGames={minGames}
                            />
                        ))}
                    </tbody>
                </table>
                {rows.length === 0 && (
                    <p className="stats-v1-page__empty">Aucune carte ne correspond aux filtres.</p>
                )}
            </div>
        </div>
    );
};

interface StatsRowProps {
    card: ApiDevStatsV1Card;
    mode: Mode;
    minGames: number;
}

const StatsRow = ({ card, mode, minGames }: StatsRowProps) => {
    const modeStats = card[mode];
    const belowMin = modeStats.playedGames < minGames;
    const winrate = modeStats.winrate;

    return (
        <tr className={clsx(belowMin && "is-dimmed")}>
            <td>
                <span className="stats-v1-page__card-id">#{card.cardId}</span> {card.label}
            </td>
            <td>{card.cost}</td>
            <td>{CARD_RARITY_LABELS[card.rarity]}</td>
            <td>{formatPct(card.liveSelectionRate)}</td>
            <td>{formatCopies(card.liveAvgCopies)}</td>
            <td>{modeStats.playedGames}</td>
            <td
                className={clsx(
                    "stats-v1-page__winrate",
                    winrate !== null && winrate > 0.52 && "is-high",
                    winrate !== null && winrate < 0.48 && "is-low",
                )}
            >
                {formatPct(winrate)}
            </td>
        </tr>
    );
};
