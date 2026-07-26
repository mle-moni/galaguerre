import type { ApiDevPlayerPeriodStats, ApiDevPlayerStatsRow } from "#api_types/dev_stats.types";
import clsx from "clsx";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PlayerNameLink } from "~/components/player_name_link";
import { useDevStatsPlayersQuery } from "~/hooks/use_dev_stats_players";
import "./stats_dev_page.css";

type SortKey = "allTime" | "last7Days" | "last30Days";

const formatCount = (value: number) => value.toLocaleString("fr-FR");

const formatPct = (value: number | null) => {
    if (value === null) return "—";
    return `${(value * 100).toFixed(0)}%`;
};

const formatDeltaPct = (value: number | null) => {
    if (value === null) return "—";
    const pct = value * 100;
    const sign = pct > 0 ? "+" : "";
    return `${sign}${pct.toFixed(0)}%`;
};

const periodTotal = (player: ApiDevPlayerStatsRow, sortKey: SortKey) => {
    if (sortKey === "last7Days") return player.last7Days.total;
    if (sortKey === "last30Days") return player.last30Days.total;
    return player.allTime.total;
};

const ModeBreakdown = ({ stats }: { stats: ApiDevPlayerPeriodStats }) => (
    <span className="stats-dev-page__breakdown" title="ranked / amicales / IA / onboarding">
        {formatCount(stats.ranked)}/{formatCount(stats.friendly)}/{formatCount(stats.training)}/
        {formatCount(stats.onboarding)}
    </span>
);

export const StatsPlayersPage = () => {
    const query = useDevStatsPlayersQuery();
    const [sortKey, setSortKey] = useState<SortKey>("allTime");
    const [search, setSearch] = useState("");

    const rows = useMemo(() => {
        const players = query.data?.data?.players ?? [];
        const needle = search.trim().toLowerCase();

        const filtered = players.filter((player) => {
            if (!needle) return true;
            const name = (player.pseudo ?? "").toLowerCase();
            return name.includes(needle) || String(player.userId).includes(needle);
        });

        return [...filtered].sort((a, b) => {
            const diff = periodTotal(b, sortKey) - periodTotal(a, sortKey);
            if (diff !== 0) return diff;
            return a.userId - b.userId;
        });
    }, [query.data?.data?.players, search, sortKey]);

    if (query.isLoading) {
        return (
            <div className="stats-dev-page">
                <p className="stats-dev-page__intro">Chargement des stats…</p>
            </div>
        );
    }

    if (query.isError || !query.data) {
        return (
            <div className="stats-dev-page">
                <p className="stats-dev-page__intro">Échec du chargement des stats.</p>
            </div>
        );
    }

    const { status, nextRefreshAt, isRefreshing, data } = query.data;
    const nextRefreshLabel = new Date(nextRefreshAt).toLocaleString("fr-FR", {
        timeZone: "Europe/Paris",
    });

    if (status === "pending" || !data) {
        return (
            <div className="stats-dev-page">
                <Link to="/dev/stats" className="stats-dev-page__back">
                    ← Dev stats
                </Link>
                <h1 className="stats-dev-page__title">Player stats</h1>
                <p className="stats-dev-page__intro">
                    {isRefreshing
                        ? "Calcul en cours en arrière-plan (cache vide après démarrage)…"
                        : "Pas encore de snapshot en cache."}{" "}
                    Prochain refresh nocturne : {nextRefreshLabel} (Europe/Paris).
                </p>
            </div>
        );
    }

    return (
        <div className="stats-dev-page">
            <header className="stats-dev-page__header">
                <div>
                    <Link to="/dev/stats" className="stats-dev-page__back">
                        ← Dev stats
                    </Link>
                    <h1 className="stats-dev-page__title">Player stats</h1>
                    <p className="stats-dev-page__intro">
                        Top {data.meta.limit} joueurs par volume de parties terminées (
                        {data.meta.timezone}). Winrate = wins / (wins + losses), draws exclus. Split
                        ranked / amicales / IA / onboarding. Snapshot nocturne 03:00
                        {isRefreshing ? " — refresh en cours…" : ""}. Généré le{" "}
                        {new Date(data.meta.generatedAt).toLocaleString("fr-FR", {
                            timeZone: "Europe/Paris",
                        })}
                        . Prochain : {nextRefreshLabel}.
                    </p>
                </div>
                <div className="stats-dev-page__meta">
                    <span>{formatCount(data.players.length)} joueurs</span>
                </div>
            </header>

            <div className="stats-dev-page__controls">
                <div className="stats-dev-page__tabs" role="tablist">
                    {(
                        [
                            ["allTime", "All-time"],
                            ["last7Days", "7 jours"],
                            ["last30Days", "30 jours"],
                        ] as const
                    ).map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            role="tab"
                            aria-selected={sortKey === key}
                            className={clsx("stats-dev-page__tab", sortKey === key && "is-active")}
                            onClick={() => setSortKey(key)}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <label className="stats-dev-page__field">
                    <span>Recherche</span>
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Pseudo ou id…"
                    />
                </label>
            </div>

            <div className="stats-dev-page__table-wrap">
                <table className="stats-dev-page__table">
                    <thead>
                        <tr>
                            <th className="num">#</th>
                            <th>Joueur</th>
                            <th className="num">Elo</th>
                            <th className="num">Total</th>
                            <th className="num">WR</th>
                            <th>Split</th>
                            <th className="num">7j</th>
                            <th className="num">Δ7j</th>
                            <th className="num">30j</th>
                            <th className="num">W-L-D</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((player, index) => {
                            const active =
                                sortKey === "last7Days"
                                    ? player.last7Days
                                    : sortKey === "last30Days"
                                      ? player.last30Days
                                      : player.allTime;

                            return (
                                <tr key={player.userId}>
                                    <td className="num">{index + 1}</td>
                                    <td>
                                        <PlayerNameLink
                                            userId={player.userId}
                                            pseudo={player.pseudo}
                                            className="stats-dev-page__player-link"
                                        />
                                    </td>
                                    <td className="num">{formatCount(player.elo)}</td>
                                    <td className="num">
                                        <strong>{formatCount(active.total)}</strong>
                                    </td>
                                    <td className="num">{formatPct(active.winrate)}</td>
                                    <td>
                                        <ModeBreakdown stats={active} />
                                    </td>
                                    <td className="num">{formatCount(player.last7Days.total)}</td>
                                    <td
                                        className={clsx(
                                            "num",
                                            "stats-dev-page__delta",
                                            player.last7Days.totalDeltaPct !== null &&
                                                player.last7Days.totalDeltaPct > 0 &&
                                                "is-up",
                                            player.last7Days.totalDeltaPct !== null &&
                                                player.last7Days.totalDeltaPct < 0 &&
                                                "is-down",
                                        )}
                                    >
                                        {formatDeltaPct(player.last7Days.totalDeltaPct)}
                                    </td>
                                    <td className="num">{formatCount(player.last30Days.total)}</td>
                                    <td className="num">
                                        {formatCount(active.wins)}-{formatCount(active.losses)}-
                                        {formatCount(active.draws)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {rows.length === 0 && (
                    <p className="stats-dev-page__empty">
                        Aucun joueur ne correspond à la recherche.
                    </p>
                )}
            </div>
        </div>
    );
};
