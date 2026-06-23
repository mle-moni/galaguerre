import "./play_page.css";
import "./game_layout.css";

import type { ApiUser } from "#api_types/auth.types";

import clsx from "clsx";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { CenteredLoader } from "~/components/centered_loader";
import { ConnectionBanner } from "~/components/connection_banner";
import { useBoardMinionVariant } from "~/hooks/use_board_minion_variant";
import { GameStateContext, useGameState } from "~/hooks/use_game_state";
import { useIsSocketReady } from "~/hooks/use_socket_connection";
import { useUser } from "~/hooks/use_user";
import { GAME_STORE } from "~/stores/store_singletons";
import { GameRenderer } from "./game_renderer.js";

interface GameProps {
    user: ApiUser;
    gameId: number;
}

const Game = ({ gameId, user }: GameProps) => {
    const gameQuery = useGameState(gameId);
    const isSocketReady = useIsSocketReady();
    const [isStoreInit, setIsStoreInit] = useState(false);

    useEffect(() => {
        if (!gameQuery.data) return;

        GAME_STORE.syncFromQuery(gameQuery.data, user);
        setIsStoreInit(true);
    }, [gameQuery.data, user]);

    if (gameQuery.isLoading || !gameQuery.data || !isStoreInit) return <CenteredLoader absolute />;

    return (
        <GameStateContext.Provider value={gameQuery.data}>
            <div className={clsx("h-full", !isSocketReady && "play-page--offline")}>
                <GameRenderer game={gameQuery.data} user={user} />
            </div>
        </GameStateContext.Provider>
    );
};

export const PlayPage = () => {
    const user = useUser();
    const boardMinionVariant = useBoardMinionVariant();
    const [activeGameId, setActiveGameId] = useState<number | null>(
        () => user?.currentGameId ?? null,
    );

    useEffect(() => {
        if (user?.currentGameId) {
            setActiveGameId(user.currentGameId);
        }
    }, [user?.currentGameId]);

    useEffect(() => {
        document.documentElement.classList.add("play-page-active");
        return () => {
            document.documentElement.classList.remove("play-page-active");
        };
    }, []);

    if (!user) return <Navigate to="/login" />;
    if (!activeGameId) return <Navigate to="/matchmaking" />;

    return (
        <div
            className={clsx(
                "play-page",
                boardMinionVariant === "rect" && "board-minion-variant--rect",
            )}
        >
            <ConnectionBanner />
            <Game user={user} gameId={activeGameId} />
        </div>
    );
};
