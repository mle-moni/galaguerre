import { Link, Navigate } from "react-router-dom";
import { getUserData } from "~/hooks/use_user";

export const HomePage = () => {
    const user = getUserData();

    if (!user) return <Navigate to="/login" />;

    return (
        <div>
            <h1>connecté en tant que {user.email}</h1>
            <Link to="/play">Jouer</Link>
        </div>
    );
};
