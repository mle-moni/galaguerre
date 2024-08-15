import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { UserContext, useUserQuery } from "./hooks/use_user.js";
import { Error404Page } from "./pages/errors/Error404Page.jsx";
import { HomePage } from "./pages/home/HomePage.jsx";
import { LoginPage } from "./pages/login/LoginPage.jsx";
import { MatchmakingPage } from "./pages/matchmaking/MatchmakingPage.jsx";
import { PlayPage } from "./pages/play/PlayPage.jsx";
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

    if (query.isLoading) return <>Loading...</>;

    return (
        <UserContext.Provider value={query.data ?? null}>
            <RouterProvider router={router} />
        </UserContext.Provider>
    );
};
