import type { ApiUser } from "#api_types/auth.types";
import { IconBell, IconLogout, IconMail } from "@tabler/icons-react";
import { observer } from "mobx-react-lite";
import { Link, useLocation } from "react-router-dom";
import { GoldCoinIcon } from "~/components/rewards/gold_coin_icon";
import { PackIcon } from "~/components/rewards/pack_icon";
import { usePacksQuery } from "~/hooks/use_collection";
import { useLogout } from "~/hooks/use_logout";
import { HOME_MOCK_PROFILE } from "~/pages/home/home_mock_data";
import { APP_HEADER_ASSETS } from "./app_header_assets";

interface AppHeaderProps {
    user: ApiUser;
    playTarget: string;
}

const NAV_ITEMS = [
    { label: "Accueil", to: "/", match: (path: string) => path === "/" },
    { label: "Jouer", to: null as string | null, dynamic: true },
    { label: "Decks", to: "/decks" },
    { label: "Collection", to: "/collection" },
    { label: "Quêtes", to: null, disabled: true },
    { label: "Boutique", to: "/collection/shop" },
    { label: "Classement", to: "/leaderboard" },
] as const;

const formatGold = (amount: number) => amount.toLocaleString("fr-FR");

export const AppHeader = observer(({ user, playTarget }: AppHeaderProps) => {
    const location = useLocation();
    const logoutMutation = useLogout();
    const packsQuery = usePacksQuery();
    const unopenedPacks = packsQuery.data?.unopenedCount ?? 0;

    return (
        <header className="app-header">
            <Link to="/" className="app-header__logo">
                Galaguerre
            </Link>

            <nav className="app-header__nav" aria-label="Navigation principale">
                {NAV_ITEMS.map((item) => {
                    const to = item.dynamic ? playTarget : item.to;
                    const isActive =
                        !("disabled" in item) &&
                        (item.match ? item.match(location.pathname) : location.pathname === to);

                    if ("disabled" in item && item.disabled) {
                        return (
                            <span key={item.label} className="app-header__nav-link app-header__nav-link--disabled">
                                {item.label}
                            </span>
                        );
                    }

                    return (
                        <Link
                            key={item.label}
                            to={to!}
                            className={`app-header__nav-link${isActive ? " app-header__nav-link--active" : ""}`}
                        >
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="app-header__right">
                <div className="app-header__currencies">
                    <span className="app-header__currency" title="Story points">
                        <GoldCoinIcon size={20} tooltip={false} />
                        {formatGold(user.goldCoins)}
                    </span>
                    <Link
                        to="/collection/packs"
                        className="app-header__currency app-header__currency--pack"
                        title="Paquets à ouvrir"
                    >
                        <PackIcon width={20} />
                        {unopenedPacks}
                    </Link>
                </div>

                <div className="app-header__icons">
                    <button type="button" className="app-header__icon-btn" aria-label="Messages">
                        <IconMail size={18} />
                        <span className="app-header__notif-dot" />
                    </button>
                    <button type="button" className="app-header__icon-btn" aria-label="Notifications">
                        <IconBell size={18} />
                    </button>
                </div>

                <div className="app-header__profile">
                    <img
                        src={APP_HEADER_ASSETS.avatarPlaceholder}
                        alt=""
                        className="app-header__avatar"
                    />
                    <div className="app-header__profile-info">
                        <span className="app-header__profile-title">
                            {user.pseudo ?? user.email.split("@")[0]}
                        </span>
                        <span className="app-header__profile-level">
                            {HOME_MOCK_PROFILE.title} · Niveau {HOME_MOCK_PROFILE.level}
                        </span>
                    </div>
                </div>

                <button
                    type="button"
                    className="app-header__logout"
                    aria-label="Déconnexion"
                    disabled={logoutMutation.isPending}
                    onClick={() => logoutMutation.mutate()}
                >
                    <IconLogout size={16} />
                </button>
            </div>
        </header>
    );
});
