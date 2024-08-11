import { createRouter } from "@swan-io/chicane";
import { useUser } from "./hooks/useUser.js";
import { Error404Page } from "./pages/errors/Error404Page.jsx";
import { HomePage } from "./pages/home/HomePage.jsx";
import { LoginPage } from "./pages/login/LoginPage.jsx";
import { RegisterPage } from "./pages/register/register.jsx";

export const Router = createRouter({
    Home: "/",
    Login: "/login",
    Register: "/register",
});

export const AppRouter = () => {
    const route = Router.useRoute(["Home", "Login", "Register"]);
    const { user, isLoading, isError } = useUser();

    if (route?.name === "Login") return <LoginPage />;

    if (isError) {
        Router.push("Login");
        return null;
    }
    if (isLoading) return <div>Loading...</div>;

    if (user && route?.name === "Home") return <HomePage />;

    if (route?.name === "Register") return <RegisterPage />;

    return <Error404Page />;
};
