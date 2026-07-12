import type { ApiUser } from "#api_types/auth.types";
import { Burger, Drawer } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { IconLogout } from "@tabler/icons-react";
import { observer } from "mobx-react-lite";
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { SoundToggle } from "~/components/cuelume/sound_toggle";
import { CUELUME_BUTTON, CUELUME_NAV } from "~/cuelume/sound_props";
import { GoldCoinIcon } from "~/components/rewards/gold_coin_icon";
import { PackIcon } from "~/components/rewards/pack_icon";
import { UserAvatar } from "~/components/user_avatar";
import { usePacksQuery } from "~/hooks/use_collection";
import { useLogout } from "~/hooks/use_logout";

interface AppHeaderProps {
    user: ApiUser;
    playTarget: string;
}

const NAV_ITEMS = [
    { label: "Accueil", to: "/", match: (path: string) => path === "/" },
    { label: "Jouer", to: null as string | null, dynamic: true },
    { label: "Decks", to: "/decks" },
    { label: "Collection", to: "/collection" },
    { label: "Boutique", to: "/collection/shop" },
    { label: "Classement", to: "/leaderboard" },
] as const;

const MOBILE_MENU_QUERY = "(max-width: 767px)";

const formatGold = (amount: number) => amount.toLocaleString("fr-FR");

interface NavLinksProps {
    playTarget: string;
    pathname: string;
    variant?: "horizontal" | "drawer";
    onNavigate?: () => void;
}

const NavLinks = ({ playTarget, pathname, variant = "horizontal", onNavigate }: NavLinksProps) => {
    const linkClassName = variant === "drawer" ? "app-header__drawer-link" : "app-header__nav-link";

    return (
        <>
            {NAV_ITEMS.map((item) => {
                const to = "dynamic" in item && item.dynamic ? playTarget : item.to;
                const isActive =
                    !("disabled" in item && item.disabled) &&
                    ("match" in item ? item.match(pathname) : pathname === to);

                if ("disabled" in item && item.disabled) {
                    return (
                        <span
                            key={item.label}
                            className={`${linkClassName} ${linkClassName}--disabled`}
                        >
                            {item.label}
                        </span>
                    );
                }

                return (
                    <Link
                        key={item.label}
                        to={to!}
                        className={`${linkClassName}${isActive ? ` ${linkClassName}--active` : ""}`}
                        onClick={onNavigate}
                        {...CUELUME_NAV}
                    >
                        {item.label}
                    </Link>
                );
            })}
        </>
    );
};

export const AppHeader = observer(({ user, playTarget }: AppHeaderProps) => {
    const location = useLocation();
    const logoutMutation = useLogout();
    const packsQuery = usePacksQuery();
    const unopenedPacks = packsQuery.data?.unopenedCount ?? 0;
    const [menuOpened, { close: closeMenu, toggle: toggleMenu }] = useDisclosure(false);
    const isMobileMenu = useMediaQuery(MOBILE_MENU_QUERY);

    useEffect(() => {
        closeMenu();
    }, [location.pathname, closeMenu]);

    useEffect(() => {
        if (!isMobileMenu) {
            closeMenu();
        }
    }, [isMobileMenu, closeMenu]);

    const displayName = user.pseudo ?? user.email.split("@")[0];

    return (
        <header className="app-header">
            <Link to="/" className="app-header__logo" {...CUELUME_NAV}>
                Galaguerre
            </Link>

            <nav className="app-header__nav" aria-label="Navigation principale">
                <NavLinks playTarget={playTarget} pathname={location.pathname} />
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
                        {...CUELUME_NAV}
                    >
                        <PackIcon width={20} />
                        {unopenedPacks}
                    </Link>
                </div>

                <div className="app-header__profile">
                    <UserAvatar
                        pseudo={user.pseudo}
                        email={user.email}
                        userId={user.id}
                        className="app-header__avatar"
                    />
                    <div className="app-header__profile-info">
                        <span className="app-header__profile-title">{displayName}</span>
                        <span className="app-header__profile-level">
                            {user.progression.levelTitle} · Niveau {user.progression.level}
                        </span>
                    </div>
                </div>

                <SoundToggle />

                <button
                    type="button"
                    className="app-header__logout"
                    aria-label="Déconnexion"
                    disabled={logoutMutation.isPending}
                    onClick={() => logoutMutation.mutate()}
                    {...CUELUME_BUTTON}
                >
                    <IconLogout size={16} />
                </button>
            </div>

            <div className="app-header__burger">
                <Burger
                    opened={menuOpened}
                    onClick={toggleMenu}
                    aria-label={menuOpened ? "Fermer le menu" : "Ouvrir le menu"}
                    size="sm"
                    color="var(--gg-gold)"
                />
            </div>

            <Drawer
                opened={menuOpened}
                onClose={closeMenu}
                position="left"
                size="min(85vw, 280px)"
                title="Navigation"
                classNames={{
                    content: "app-header__drawer-content",
                    header: "app-header__drawer-header",
                    title: "app-header__drawer-title",
                    close: "app-header__drawer-close",
                    body: "app-header__drawer-body",
                }}
                overlayProps={{ backgroundOpacity: 0.55, blur: 2 }}
            >
                <div className="app-header__drawer-inner">
                    <nav className="app-header__drawer-nav" aria-label="Navigation principale">
                        <NavLinks
                            playTarget={playTarget}
                            pathname={location.pathname}
                            variant="drawer"
                            onNavigate={closeMenu}
                        />
                    </nav>

                    <div className="app-header__drawer-footer">
                        <div className="app-header__profile app-header__profile--drawer">
                            <UserAvatar
                                pseudo={user.pseudo}
                                email={user.email}
                                userId={user.id}
                                className="app-header__avatar"
                            />
                            <div className="app-header__profile-info">
                                <span className="app-header__profile-title">{displayName}</span>
                                <span className="app-header__profile-level">
                                    {user.progression.levelTitle} · Niveau {user.progression.level}
                                </span>
                            </div>
                        </div>

                        <SoundToggle variant="drawer" />

                        <button
                            type="button"
                            className="app-header__drawer-logout"
                            disabled={logoutMutation.isPending}
                            onClick={() => logoutMutation.mutate()}
                            {...CUELUME_BUTTON}
                        >
                            <IconLogout size={18} />
                            Déconnexion
                        </button>
                    </div>
                </div>
            </Drawer>
        </header>
    );
});
