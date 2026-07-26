import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";
import { AppLayout } from "./components/layout/app_layout.jsx";
import { AppShell } from "./components/layout/app_shell.jsx";
import { CenteredLoader } from "./components/centered_loader.jsx";
import { UserContext, useUserQuery } from "./hooks/use_user.js";
import "./router.types.js";
import { Error404Page } from "./pages/errors/error_404_page.jsx";
import { CollectionPage } from "./pages/collection/collection_page.jsx";
import { CollectionShopPage } from "./pages/collection/collection_shop_page.jsx";
import { PackOpeningPage } from "./pages/collection/pack_opening_page.jsx";
import { DeckSharePage } from "./pages/decks/deck_share_page.jsx";
import { DeckBuilderPage } from "./pages/decks/deck_builder_page.jsx";
import { DecksPage } from "./pages/decks/decks_page.jsx";
import { BoardMinionStylesPage } from "./pages/dev/board_minion_styles_page.jsx";
import { GoldenCardsPage } from "./pages/dev/golden_cards_page.jsx";
import { StatsCardsPage } from "./pages/dev/stats_cards_page.jsx";
import { StatsGamesPage } from "./pages/dev/stats_games_page.jsx";
import { StatsHubPage } from "./pages/dev/stats_hub_page.jsx";
import { StatsPlayersPage } from "./pages/dev/stats_players_page.jsx";
import { FriendsPage } from "./pages/friends/friends_page.jsx";
import { HomePage } from "./pages/home/home_page.jsx";
import { LoginPage } from "./pages/login/login_page.jsx";
import { MatchmakingPage } from "./pages/matchmaking/match_making_page.jsx";
import { PlayPage } from "./pages/play/play_page.jsx";
import { SpectatePage } from "./pages/spectate/spectate_page.jsx";
import { GameHistoryDetailPage } from "./pages/game_history/game_history_detail_page.jsx";
import { GameHistoryListPage } from "./pages/game_history/game_history_list_page.jsx";
import { ReplayPage } from "./pages/replay/replay_page.jsx";
import { LeaderboardPage } from "./pages/leaderboard/leaderboard_page.jsx";
import { OnboardingPage } from "./pages/onboarding/onboarding_page.jsx";
import { ProfilePage } from "./pages/profile/profile_page.jsx";
import { RegisterPage } from "./pages/register/register.jsx";
import { NewsDetailPage } from "./pages/news/news_detail_page.jsx";
import { NewsListPage } from "./pages/news/news_list_page.jsx";
import { RulesPage } from "./pages/rules/rules_page.jsx";

const router = createBrowserRouter([
    {
        element: <AppShell />,
        children: [
            {
                path: "/play",
                element: <PlayPage />,
            },
            {
                path: "/spectate/:gameId",
                element: <SpectatePage />,
            },
            {
                path: "/login",
                element: <LoginPage />,
            },
            {
                path: "/register",
                element: <RegisterPage />,
            },
            {
                element: <AppLayout />,
                children: [
                    {
                        path: "/",
                        element: <HomePage />,
                    },
                    {
                        path: "/collection",
                        element: <CollectionPage />,
                        handle: { fillViewport: true },
                    },
                    {
                        path: "/collection/packs",
                        element: <PackOpeningPage />,
                        handle: { fillViewport: true },
                    },
                    {
                        path: "/collection/shop",
                        element: <CollectionShopPage />,
                        handle: { fillViewport: true },
                    },
                    {
                        path: "/decks",
                        element: <DecksPage />,
                        handle: { fillViewport: true },
                    },
                    {
                        path: "/decks/s/:code",
                        element: <DeckSharePage />,
                    },
                    {
                        path: "/decks/:id",
                        element: <DeckBuilderPage />,
                        handle: { fillViewport: true },
                    },
                    {
                        path: "/matchmaking",
                        element: <MatchmakingPage />,
                        handle: { fillViewport: true },
                    },
                    {
                        path: "/rules",
                        element: <RulesPage />,
                    },
                    {
                        path: "/actualites",
                        element: <NewsListPage />,
                        handle: { public: true },
                    },
                    {
                        path: "/actualites/:slug",
                        element: <NewsDetailPage />,
                        handle: { public: true },
                    },
                    {
                        path: "/profile",
                        element: <ProfilePage />,
                    },
                    {
                        path: "/onboarding",
                        element: <OnboardingPage />,
                    },
                    {
                        path: "/leaderboard",
                        element: <LeaderboardPage />,
                        handle: { fillViewport: true, public: true },
                    },
                    {
                        path: "/friends",
                        element: <FriendsPage />,
                    },
                    {
                        path: "/game-history/:userId",
                        element: <GameHistoryListPage />,
                        handle: { fillViewport: true },
                    },
                    {
                        path: "/game-history/:userId/:gameId",
                        element: <GameHistoryDetailPage />,
                        handle: { fillViewport: true },
                    },
                    {
                        path: "/game-history/:userId/:gameId/replay",
                        element: <ReplayPage />,
                        handle: { fillViewport: true },
                    },
                    {
                        path: "/dev/board-minion-styles",
                        element: <BoardMinionStylesPage />,
                    },
                    {
                        path: "/dev/golden-cards",
                        element: <GoldenCardsPage />,
                    },
                    {
                        path: "/dev/stats",
                        element: <StatsHubPage />,
                    },
                    {
                        path: "/dev/stats/cards",
                        element: <StatsCardsPage />,
                    },
                    {
                        path: "/dev/stats/games",
                        element: <StatsGamesPage />,
                    },
                    {
                        path: "/dev/stats/players",
                        element: <StatsPlayersPage />,
                    },
                    {
                        path: "/dev/stats/v1",
                        element: <Navigate to="/dev/stats/cards" replace />,
                    },
                    {
                        path: "*",
                        element: <Error404Page />,
                    },
                ],
            },
        ],
    },
]);

export const AppRouterProvider = () => {
    const query = useUserQuery();

    if (query.isLoading) return <CenteredLoader absolute />;

    return (
        <UserContext.Provider value={query.data ?? null}>
            <RouterProvider router={router} />
        </UserContext.Provider>
    );
};
