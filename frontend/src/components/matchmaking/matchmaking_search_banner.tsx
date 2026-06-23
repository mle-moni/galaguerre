import { Button, Loader } from "@mantine/core";
import { observer } from "mobx-react-lite";
import { useLocation, useNavigate } from "react-router-dom";
import { useMatchmaking } from "~/hooks/use_matchmaking";
import "./matchmaking_search_banner.css";

const HIDDEN_ROUTES = new Set(["/play", "/login", "/register"]);

export const MatchmakingSearchBanner = observer(() => {
    const { isSearching, cancelSearch, isCancelling } = useMatchmaking();
    const location = useLocation();
    const navigate = useNavigate();

    if (!isSearching || HIDDEN_ROUTES.has(location.pathname)) return null;

    return (
        <div className="matchmaking-search-banner" role="status">
            <button
                type="button"
                className="matchmaking-search-banner__content border-0 bg-transparent text-left p-0 text-white"
                onClick={() => navigate("/matchmaking")}
            >
                <Loader size="sm" color="gold" />
                <div>
                    <div className="matchmaking-search-banner__text">
                        Recherche d'adversaire en cours…
                    </div>
                    <div className="matchmaking-search-banner__subtext">
                        Cliquez pour voir les détails
                    </div>
                </div>
            </button>
            <Button
                className="matchmaking-search-banner__cancel"
                variant="outline"
                color="gold"
                size="xs"
                loading={isCancelling}
                onClick={() => cancelSearch()}
            >
                Annuler
            </Button>
        </div>
    );
});
