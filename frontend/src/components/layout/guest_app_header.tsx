import { Link, useLocation } from "react-router-dom";
import { SoundToggle } from "~/components/cuelume/sound_toggle";
import { CUELUME_NAV } from "~/cuelume/sound_props";

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
            <Link to="/actualites" className="app-header__logo" {...CUELUME_NAV}>
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
                            {...CUELUME_NAV}
                        >
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="app-header__right">
                <SoundToggle />
                <Link to="/login" className="app-header__nav-link" {...CUELUME_NAV}>
                    Connexion
                </Link>
                <Link
                    to="/register"
                    className="app-header__nav-link app-header__nav-link--active"
                    {...CUELUME_NAV}
                >
                    S&apos;inscrire
                </Link>
            </div>
        </header>
    );
};
