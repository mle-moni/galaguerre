import { Navigate } from "react-router-dom";
import { getUserData } from "~/hooks/use_user";

export const PlayPage = () => {
    const user = getUserData();

    if (!user) return <Navigate to="/login" />;

    return <h1>Home page {user.email}</h1>;
};
