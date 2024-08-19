import "./play_page.css";

import type { ApiUser } from "#api_types/auth.types";

import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { CenteredLoader } from "~/components/centered_loader";
import { useDimensions } from "~/hooks/use_dimensions";
import { GameStateContext, useGameState } from "~/hooks/use_game_state";
import { useUser } from "~/hooks/use_user";
import { GAME_STORE } from "~/stores/store_singletons";
import { GameRenderer } from "./game_renderer.js";

interface GameProps {
    user: ApiUser;
    gameId: number;
}

const Game = ({ gameId, user }: GameProps) => {
    const gameQuery = useGameState(gameId);
    const [isStoreInit, setIsStoreInit] = useState(false);

    useEffect(() => {
        if (!gameQuery.data) return;

        GAME_STORE.init(gameQuery.data, user);
        setIsStoreInit(true);
    }, [gameQuery.data, user]);

    if (gameQuery.isLoading || !gameQuery.data || !isStoreInit) return <CenteredLoader absolute />;

    return (
        <GameStateContext.Provider value={gameQuery.data}>
            <GameRenderer game={gameQuery.data} user={user} />
        </GameStateContext.Provider>
    );
};

export const PlayPage = () => {
    const dimensions = useDimensions();
    const user = useUser();

    if (!user) return <Navigate to="/login" />;
    if (!user.currentGameId) return <Navigate to="/matchmaking" />;

    return (
        <div
            style={{
                width: dimensions.width,
                height: dimensions.height,
                backgroundColor: "#da9854",
            }}
        >
            <Game user={user} gameId={user.currentGameId} />
        </div>
    );
};
