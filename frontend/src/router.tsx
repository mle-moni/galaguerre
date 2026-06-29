import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { AppShell } from "./components/layout/app_shell.jsx";
import { CenteredLoader } from "./components/centered_loader.jsx";
import { UserContext, useUserQuery } from "./hooks/use_user.js";
import { Error404Page } from "./pages/errors/error_404_page.jsx";
import { CollectionPage } from "./pages/collection/collection_page.jsx";
import { CollectionShopPage } from "./pages/collection/collection_shop_page.jsx";
import { PackOpeningPage } from "./pages/collection/pack_opening_page.jsx";
import { DeckBuilderPage } from "./pages/decks/deck_builder_page.jsx";
import { DecksPage } from "./pages/decks/decks_page.jsx";
import { BoardMinionStylesPage } from "./pages/dev/board_minion_styles_page.jsx";
import { FriendsPage } from "./pages/friends/friends_page.jsx";
import { HomePage } from "./pages/home/home_page.jsx";
import { LoginPage } from "./pages/login/login_page.jsx";
import { MatchmakingPage } from "./pages/matchmaking/match_making_page.jsx";
import { PlayPage } from "./pages/play/play_page.jsx";
import { TrainingPage } from "./pages/training/training_page.jsx";
import { GameHistoryDetailPage } from "./pages/game_history/game_history_detail_page.jsx";
import { GameHistoryListPage } from "./pages/game_history/game_history_list_page.jsx";
import { ReplayPage } from "./pages/replay/replay_page.jsx";
import { LeaderboardPage } from "./pages/leaderboard/leaderboard_page.jsx";
import { OnboardingPage } from "./pages/onboarding/onboarding_page.jsx";
import { RegisterPage } from "./pages/register/register.jsx";
import { RulesPage } from "./pages/rules/rules_page.jsx";

const router = createBrowserRouter([
    {
        element: <AppShell />,
        children: [
            {
                path: "/",
                element: <HomePage />,
            },
            {
                path: "/play",
                element: <PlayPage />,
            },
            {
                path: "/collection",
                element: <CollectionPage />,
            },
            {
                path: "/collection/packs",
                element: <PackOpeningPage />,
            },
            {
                path: "/collection/shop",
                element: <CollectionShopPage />,
            },
            {
                path: "/decks",
                element: <DecksPage />,
            },
            {
                path: "/decks/:id",
                element: <DeckBuilderPage />,
            },
            {
                path: "/matchmaking",
                element: <MatchmakingPage />,
            },
            {
                path: "/training",
                element: <TrainingPage />,
            },
            {
                path: "/rules",
                element: <RulesPage />,
            },
            {
                path: "/onboarding",
                element: <OnboardingPage />,
            },
            {
                path: "/leaderboard",
                element: <LeaderboardPage />,
            },
            {
                path: "/friends",
                element: <FriendsPage />,
            },
            {
                path: "/game-history/:userId",
                element: <GameHistoryListPage />,
            },
            {
                path: "/game-history/:userId/:gameId",
                element: <GameHistoryDetailPage />,
            },
            {
                path: "/game-history/:userId/:gameId/replay",
                element: <ReplayPage />,
            },
            {
                path: "/dev/board-minion-styles",
                element: <BoardMinionStylesPage />,
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
                path: "*",
                element: <Error404Page />,
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
