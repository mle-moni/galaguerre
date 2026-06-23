import { Outlet } from "react-router-dom";
import { MatchmakingOrchestrator } from "~/components/matchmaking/matchmaking_orchestrator";
import { MatchmakingSearchBanner } from "~/components/matchmaking/matchmaking_search_banner";

export const AppShell = () => {
    return (
        <>
            <MatchmakingOrchestrator />
            <MatchmakingSearchBanner />
            <Outlet />
        </>
    );
};
