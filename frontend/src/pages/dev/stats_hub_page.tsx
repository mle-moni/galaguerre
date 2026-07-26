import { Link } from "react-router-dom";
import "./stats_dev_page.css";

const ENTRIES = [
    {
        to: "/dev/stats/cards",
        title: "Cards stats",
        description:
            "Sélection live des cartes collectibles et winrate when-played (humain vs IA).",
    },
    {
        to: "/dev/stats/games",
        title: "Game stats",
        description:
            "Volume de parties par jour / semaine / mois, par mode (ranked, amicales, IA, onboarding).",
    },
] as const;

export const StatsHubPage = () => (
    <div className="stats-dev-page">
        <header className="stats-dev-page__header">
            <div>
                <h1 className="stats-dev-page__title">Dev stats</h1>
                <p className="stats-dev-page__intro">
                    Hub d&apos;outils d&apos;équilibrage — URL secrète : <code>/dev/stats</code>.
                    Snapshots recalculés chaque nuit à 03:00 (Europe/Paris).
                </p>
            </div>
        </header>

        <div className="stats-dev-page__links">
            {ENTRIES.map((entry) => (
                <Link key={entry.to} to={entry.to} className="stats-dev-page__link">
                    <span className="stats-dev-page__link-title">{entry.title}</span>
                    <p className="stats-dev-page__link-desc">{entry.description}</p>
                </Link>
            ))}
        </div>
    </div>
);
