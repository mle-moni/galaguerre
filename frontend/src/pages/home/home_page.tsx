import { observer } from "mobx-react-lite";
import { Link, Navigate } from "react-router-dom";
import { AppLayout } from "~/components/layout/app_layout";
import { CenteredLoader } from "~/components/centered_loader";
import { useDecksQuery } from "~/hooks/use_decks";
import { useUser } from "~/hooks/use_user";

export const HomePage = observer(() => {
    const user = useUser();
    const decksQuery = useDecksQuery();

    if (!user) return <Navigate to="/login" />;

    const selectedDeck = decksQuery.data?.find((d) => d.selected);
    const playTarget = user.currentGameId ? "/play" : "/matchmaking";

    return (
        <AppLayout>
            <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gg-navy m-0">
                        Bienvenue, {user.pseudo ?? user.email.split("@")[0]}
                    </h1>
                    <p className="text-gg-navy/60 text-sm mt-1 mb-0">
                        Elo : {user.elo} — {user.wins}V / {user.losses}D
                    </p>
                </div>

                <div className="flex flex-wrap gap-6 justify-center">
                    <Link to={playTarget} className="gg-mode-tile">
                        <span className="gg-mode-tile__icon">⚔️</span>
                        <h2 className="gg-mode-tile__title">Jouer</h2>
                        <p className="gg-mode-tile__subtitle">
                            {user.currentGameId
                                ? "Reprendre votre partie en cours"
                                : "Trouver un adversaire"}
                        </p>
                        {decksQuery.isLoading ? (
                            <CenteredLoader />
                        ) : selectedDeck ? (
                            <p className="gg-mode-tile__subtitle">
                                Deck actif : {selectedDeck.name} ({selectedDeck.cardCount} cartes)
                            </p>
                        ) : (
                            <p className="gg-mode-tile__subtitle text-red-300">
                                Aucun deck sélectionné
                            </p>
                        )}
                    </Link>

                    <Link to="/decks" className="gg-mode-tile">
                        <span className="gg-mode-tile__icon">🃏</span>
                        <h2 className="gg-mode-tile__title">Mes decks</h2>
                        <p className="gg-mode-tile__subtitle">
                            Créer et modifier vos decks de combat
                        </p>
                    </Link>

                    <Link to="/leaderboard" className="gg-mode-tile">
                        <span className="gg-mode-tile__icon">🏆</span>
                        <h2 className="gg-mode-tile__title">Classement</h2>
                        <p className="gg-mode-tile__subtitle">
                            Consultez le classement Elo des joueurs
                        </p>
                    </Link>

                    <Link to={`/game-history/${user.id}`} className="gg-mode-tile">
                        <span className="gg-mode-tile__icon">📜</span>
                        <h2 className="gg-mode-tile__title">Mon historique</h2>
                        <p className="gg-mode-tile__subtitle">
                            Consultez vos dernières parties et statistiques
                        </p>
                    </Link>
                </div>
            </div>
        </AppLayout>
    );
});
