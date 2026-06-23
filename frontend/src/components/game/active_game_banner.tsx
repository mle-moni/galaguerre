import { Button } from "@mantine/core";
import { IconPlayCard } from "@tabler/icons-react";
import { observer } from "mobx-react-lite";
import { useLocation, useNavigate } from "react-router-dom";
import { useUser } from "~/hooks/use_user";
import "../matchmaking/matchmaking_search_banner.css";

const HIDDEN_ROUTES = new Set(["/play", "/login", "/register"]);

export const ActiveGameBanner = observer(() => {
    const user = useUser();
    const location = useLocation();
    const navigate = useNavigate();

    const hasActiveGame = Boolean(user?.currentGameId);

    if (!hasActiveGame || HIDDEN_ROUTES.has(location.pathname)) return null;

    return (
        <div className="matchmaking-search-banner" role="status">
            <button
                type="button"
                className="matchmaking-search-banner__content border-0 bg-transparent text-left p-0 text-white"
                onClick={() => navigate("/play")}
            >
                <IconPlayCard size={20} color="var(--gg-gold, #c9a227)" />
                <div>
                    <div className="matchmaking-search-banner__text">Partie en cours…</div>
                    <div className="matchmaking-search-banner__subtext">Cliquez pour reprendre</div>
                </div>
            </button>
            <Button
                className="matchmaking-search-banner__cancel"
                variant="outline"
                color="gold"
                size="xs"
                onClick={() => navigate("/play")}
            >
                Reprendre
            </Button>
        </div>
    );
});
