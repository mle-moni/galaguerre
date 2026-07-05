import { Link, useLocation } from "react-router-dom";

const NAV_ITEMS = [
    {
        label: "Actualités",
        to: "/actualites",
        match: (path: string) => path === "/actualites" || path.startsWith("/actualites/"),
    },
    { label: "Classement", to: "/leaderboard", match: (path: string) => path === "/leaderboard" },
] as const;

export const GuestAppHeader = () => {
    const { pathname } = useLocation();

    return (
        <header className="app-header">
            <Link to="/actualites" className="app-header__logo">
                Galaguerre
            </Link>

            <nav className="app-header__nav" aria-label="Navigation principale">
                {NAV_ITEMS.map((item) => {
                    const isActive = item.match(pathname);

                    return (
                        <Link
                            key={item.label}
                            to={item.to}
                            className={`app-header__nav-link${isActive ? " app-header__nav-link--active" : ""}`}
                        >
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="app-header__right">
                <Link to="/login" className="app-header__nav-link">
                    Connexion
                </Link>
                <Link to="/register" className="app-header__nav-link app-header__nav-link--active">
                    S&apos;inscrire
                </Link>
            </div>
        </header>
    );
};
