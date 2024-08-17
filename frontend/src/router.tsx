import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { CenteredLoader } from "./components/centered_loader.jsx";
import { UserContext, useUserQuery } from "./hooks/use_user.js";
import { Error404Page } from "./pages/errors/error_404_page.jsx";
import { HomePage } from "./pages/home/home_page.jsx";
import { LoginPage } from "./pages/login/login_page.jsx";
import { MatchmakingPage } from "./pages/matchmaking/match_making_page.jsx";
import { PlayPage } from "./pages/play/play_page.jsx";
import { RegisterPage } from "./pages/register/register.jsx";

const router = createBrowserRouter([
    {
        path: "/",
        element: <HomePage />,
    },
    {
        path: "/play",
        element: <PlayPage />,
    },
    {
        path: "/matchmaking",
        element: <MatchmakingPage />,
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
