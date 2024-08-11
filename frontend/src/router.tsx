import { createRouter } from "@swan-io/chicane";
import { Error404Page } from "./errors/Error404Page.jsx";
import { HomePage } from "./home/HomePage.jsx";
import { LoginPage } from "./login/LoginPage.jsx";

export const Router = createRouter({
    Home: "/",
    Login: "/login",
});

export const AppRouter = () => {
    const route = Router.useRoute(["Home", "Login"]);

    if (route?.name === "Home") return <HomePage />;

    if (route?.name === "Login") return <LoginPage />;

    return <Error404Page />;
};
