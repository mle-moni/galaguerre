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
            <div className="flex flex-1 flex-col items-center justify-start sm:justify-center gap-6 sm:gap-8 w-full min-h-0">
                <div className="text-center px-2">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gg-navy m-0">
                        Bienvenue, {user.pseudo ?? user.email.split("@")[0]}
                    </h1>
                    <p className="text-gg-navy/60 text-sm mt-1 mb-0">
                        Elo : {user.elo} — {user.wins}V / {user.losses}D
                    </p>
                </div>

                <div className="flex flex-wrap gap-4 sm:gap-6 justify-center w-full px-2">
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

                    <Link to={user.currentGameId ? "/play" : "/training"} className="gg-mode-tile">
                        <span className="gg-mode-tile__icon">🤖</span>
                        <h2 className="gg-mode-tile__title">Entraînement</h2>
                        <p className="gg-mode-tile__subtitle">
                            {user.currentGameId
                                ? "Reprendre votre partie en cours"
                                : "S'entraîner contre l'IA"}
                        </p>
                        <p className="gg-mode-tile__subtitle">IA à deck fixe — sans impact Elo</p>
                    </Link>

                    <Link to="/decks" className="gg-mode-tile">
                        <span className="gg-mode-tile__icon">🃏</span>
                        <h2 className="gg-mode-tile__title">Mes decks</h2>
                        <p className="gg-mode-tile__subtitle">
                            Créer et modifier vos decks de combat
                        </p>
                    </Link>

                    <Link to="/collection" className="gg-mode-tile">
                        <span className="gg-mode-tile__icon">📚</span>
                        <h2 className="gg-mode-tile__title">Collection</h2>
                        <p className="gg-mode-tile__subtitle">Parcourir toutes les cartes du jeu</p>
                    </Link>

                    <Link to="/leaderboard" className="gg-mode-tile">
                        <span className="gg-mode-tile__icon">🏆</span>
                        <h2 className="gg-mode-tile__title">Classement</h2>
                        <p className="gg-mode-tile__subtitle">
                            Consultez le classement Elo des joueurs
                        </p>
                    </Link>

                    <Link to="/friends" className="gg-mode-tile">
                        <span className="gg-mode-tile__icon">👥</span>
                        <h2 className="gg-mode-tile__title">Amis</h2>
                        <p className="gg-mode-tile__subtitle">
                            Retrouvez et ajoutez des joueurs par pseudo
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
