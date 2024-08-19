import "./play_page.css";

import type { ApiUser } from "#api_types/auth.types";

import { observable } from "mobx";
import { observer } from "mobx-react-lite";
import { Navigate } from "react-router-dom";
import { CenteredLoader } from "~/components/centered_loader";
import { useDimensions } from "~/hooks/use_dimensions";
import { GameStateContext, useGameState } from "~/hooks/use_game_state";
import { useUser } from "~/hooks/use_user";
import { GameRenderer } from "./game_renderer.js";

interface GameProps {
    user: ApiUser;
    gameId: number;
}

const Game = observable(({ gameId, user }: GameProps) => {
    const gameQuery = useGameState(gameId);

    if (gameQuery.isLoading || !gameQuery.data) return <CenteredLoader absolute />;

    return (
        <GameStateContext.Provider value={gameQuery.data}>
            <GameRenderer game={gameQuery.data} user={user} />
        </GameStateContext.Provider>
    );
});

export const PlayPage = observer(() => {
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
});
