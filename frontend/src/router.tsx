import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { useUser } from "./hooks/use_user.js";
import { Error404Page } from "./pages/errors/Error404Page.jsx";
import { HomePage } from "./pages/home/HomePage.jsx";
import { LoginPage } from "./pages/login/LoginPage.jsx";
import { RegisterPage } from "./pages/register/register.jsx";

const router = createBrowserRouter([
    {
        path: "/",
        element: <HomePage />,
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
    const { isLoading } = useUser();

    if (isLoading) return <>Loading...</>;

    return <RouterProvider router={router} />;
};
