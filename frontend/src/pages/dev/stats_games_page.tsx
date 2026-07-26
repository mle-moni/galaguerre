import type {
    ApiDevGameModeCounts,
    ApiDevGameStatsBucket,
    ApiDevGameStatsRollingDay,
} from "#api_types/dev_stats.types";
import clsx from "clsx";
import { Link } from "react-router-dom";
import { useDevStatsGamesQuery } from "~/hooks/use_dev_stats_games";
import "./stats_dev_page.css";

const formatCount = (value: number) => value.toLocaleString("fr-FR");

const formatDeltaPct = (value: number | null) => {
    if (value === null) return "—";
    const pct = value * 100;
    const sign = pct > 0 ? "+" : "";
    return `${sign}${pct.toFixed(0)}%`;
};

const CountsCells = ({ counts }: { counts: ApiDevGameModeCounts }) => (
    <>
        <td className="num">{formatCount(counts.ranked)}</td>
        <td className="num">{formatCount(counts.friendly)}</td>
        <td className="num">{formatCount(counts.training)}</td>
        <td className="num">{formatCount(counts.onboarding)}</td>
        <td className="num">
            <strong>{formatCount(counts.total)}</strong>
        </td>
    </>
);

const DeltaCell = ({ value }: { value: number | null }) => (
    <td
        className={clsx(
            "num",
            "stats-dev-page__delta",
            value !== null && value > 0 && "is-up",
            value !== null && value < 0 && "is-down",
        )}
    >
        {formatDeltaPct(value)}
    </td>
);

const ModeCountHeaders = () => (
    <>
        <th className="num">Ranked</th>
        <th className="num">Amicales</th>
        <th className="num">vs IA</th>
        <th className="num">Onboarding</th>
        <th className="num">Total</th>
    </>
);

const BucketTable = ({ title, rows }: { title: string; rows: ApiDevGameStatsBucket[] }) => (
    <section>
        <h2 className="stats-dev-page__section-title">{title}</h2>
        <div className="stats-dev-page__table-wrap">
            <table className="stats-dev-page__table">
                <thead>
                    <tr>
                        <th>Période</th>
                        <ModeCountHeaders />
                    </tr>
                </thead>
                <tbody>
                    {[...rows].reverse().map((row) => (
                        <tr key={row.periodStart}>
                            <td>{row.label}</td>
                            <CountsCells counts={row} />
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </section>
);

const Rolling7DaysTable = ({
    days,
    window,
}: {
    days: ApiDevGameStatsRollingDay[];
    window: ApiDevGameModeCounts & { previousWeekTotal: number; totalDeltaPct: number | null };
}) => (
    <section>
        <h2 className="stats-dev-page__section-title">7 jours glissants (Δ vs même jour J−7)</h2>
        <div className="stats-dev-page__table-wrap">
            <table className="stats-dev-page__table">
                <thead>
                    <tr>
                        <th>Jour</th>
                        <ModeCountHeaders />
                        <th className="num">S−1</th>
                        <th className="num">Δ%</th>
                    </tr>
                </thead>
                <tbody>
                    {[...days].reverse().map((row) => (
                        <tr key={row.periodStart}>
                            <td>{row.label}</td>
                            <CountsCells counts={row} />
                            <td className="num">{formatCount(row.previousWeekTotal)}</td>
                            <DeltaCell value={row.totalDeltaPct} />
                        </tr>
                    ))}
                    <tr className="stats-dev-page__table-foot">
                        <td>
                            <strong>Fenêtre 7j</strong>
                        </td>
                        <CountsCells counts={window} />
                        <td className="num">
                            <strong>{formatCount(window.previousWeekTotal)}</strong>
                        </td>
                        <DeltaCell value={window.totalDeltaPct} />
                    </tr>
                </tbody>
            </table>
        </div>
    </section>
);

export const StatsGamesPage = () => {
    const query = useDevStatsGamesQuery();

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
                <h1 className="stats-dev-page__title">Game stats</h1>
                <p className="stats-dev-page__intro">
                    {isRefreshing
                        ? "Calcul en cours en arrière-plan (cache vide après démarrage)…"
                        : "Pas encore de snapshot en cache."}{" "}
                    Prochain refresh nocturne : {nextRefreshLabel} (Europe/Paris).
                </p>
            </div>
        );
    }

    const { totals, rolling7Days, byDay, byWeek, byMonth, meta } = data;

    return (
        <div className="stats-dev-page">
            <header className="stats-dev-page__header">
                <div>
                    <Link to="/dev/stats" className="stats-dev-page__back">
                        ← Dev stats
                    </Link>
                    <h1 className="stats-dev-page__title">Game stats</h1>
                    <p className="stats-dev-page__intro">
                        Volume de parties terminées ({meta.timezone}). Snapshot nocturne 03:00
                        {isRefreshing ? " — refresh en cours…" : ""}. Généré le{" "}
                        {new Date(meta.generatedAt).toLocaleString("fr-FR", {
                            timeZone: "Europe/Paris",
                        })}
                        . Prochain : {nextRefreshLabel}.
                    </p>
                </div>
                <div className="stats-dev-page__meta">
                    <span>{formatCount(totals.total)} total</span>
                    <span>{formatCount(totals.ranked)} ranked</span>
                    <span>{formatCount(totals.friendly)} amicales</span>
                    <span>{formatCount(totals.training)} vs IA</span>
                    <span>{formatCount(totals.onboarding)} onboarding</span>
                    <span>
                        7j {formatCount(rolling7Days.window.total)} (
                        {formatDeltaPct(rolling7Days.window.totalDeltaPct)})
                    </span>
                </div>
            </header>

            <div className="stats-dev-page__table-wrap">
                <table className="stats-dev-page__table">
                    <thead>
                        <tr>
                            <th>All-time</th>
                            <ModeCountHeaders />
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Toutes périodes</td>
                            <CountsCells counts={totals} />
                        </tr>
                    </tbody>
                </table>
            </div>

            <Rolling7DaysTable days={rolling7Days.days} window={rolling7Days.window} />
            <BucketTable title="Par jour (30 derniers)" rows={byDay} />
            <BucketTable title="Par semaine (12 dernières)" rows={byWeek} />
            <BucketTable title="Par mois (12 derniers)" rows={byMonth} />
        </div>
    );
};
