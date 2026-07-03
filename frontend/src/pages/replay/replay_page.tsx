import clsx from "clsx";
import { useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import { CenteredLoader } from "~/components/centered_loader";
import { useBoardMinionVariant } from "~/hooks/use_board_minion_variant";
import { useGameReplayQuery } from "~/hooks/use_game_replay";
import { GameStateContext, ReplayStoreContext } from "~/hooks/use_game_state";
import { useReplayGamepad } from "~/hooks/use_replay_gamepad";
import { useReplayUrlSync } from "~/hooks/use_replay_url_sync";
import { REPLAY_STORE } from "~/stores/ReplayStore";
import { ReplayControls } from "./replay_controls.jsx";
import { ReplayRenderer } from "./replay_renderer.jsx";

export const ReplayPage = () => {
    const boardMinionVariant = useBoardMinionVariant();
    const { userId: userIdParam, gameId: gameIdParam } = useParams();
    const userId = Number(userIdParam);
    const gameId = Number(gameIdParam);
    const replayQuery = useGameReplayQuery(userId, gameId);
    const { switchPerspective } = useReplayUrlSync(replayQuery.data, userId, gameId);

    useEffect(() => {
        return () => REPLAY_STORE.clear();
    }, []);

    useReplayGamepad(REPLAY_STORE);

    if (!Number.isFinite(userId) || userId <= 0 || !Number.isFinite(gameId) || gameId <= 0) {
        return <Navigate to="/leaderboard" />;
    }

    if (replayQuery.isLoading) return <CenteredLoader absolute />;

    if (replayQuery.isError || !replayQuery.data) {
        return (
            <div className="gg-panel p-8 text-center max-w-3xl mx-auto">
                <p className="text-white/80 m-0">Replay indisponible pour cette partie.</p>
            </div>
        );
    }

    return (
        <ReplayStoreContext.Provider value={REPLAY_STORE}>
            <GameStateContext.Provider value={REPLAY_STORE.displayGame}>
                <div
                    className={clsx(
                        "flex flex-col gap-4 h-full min-h-0 min-w-0 w-full overflow-hidden",
                        boardMinionVariant === "rect" && "board-minion-variant--rect",
                    )}
                >
                    <div className="flex-1 min-h-0 min-w-0 relative overflow-hidden">
                        <ReplayRenderer />
                    </div>
                    <ReplayControls
                        store={REPLAY_STORE}
                        replay={replayQuery.data}
                        onSwitchPerspective={switchPerspective}
                    />
                </div>
            </GameStateContext.Provider>
        </ReplayStoreContext.Provider>
    );
};
