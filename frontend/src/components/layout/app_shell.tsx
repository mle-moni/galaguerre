import { Outlet } from "react-router-dom";
import { ActiveGameBanner } from "~/components/game/active_game_banner";
import { MatchmakingOrchestrator } from "~/components/matchmaking/matchmaking_orchestrator";
import { MatchmakingSearchBanner } from "~/components/matchmaking/matchmaking_search_banner";
import { DailyPackModal } from "~/components/rewards/daily_pack_modal";

export const AppShell = () => {
    return (
        <>
            <MatchmakingOrchestrator />
            <MatchmakingSearchBanner />
            <ActiveGameBanner />
            <DailyPackModal />
            <Outlet />
        </>
    );
};
