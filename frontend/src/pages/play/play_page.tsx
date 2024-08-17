import type { ApiUser } from "#api_types/auth.types";
import { Navigate } from "react-router-dom";
import { useUser } from "~/hooks/use_user";
import { useGameState } from "../../hooks/use_game_state.js";
import { GameRenderer } from "./game_renderer.js";

interface GameProps {
    user: ApiUser;
    gameId: number;
}

const Game = ({ gameId, user }: GameProps) => {
    const gameQuery = useGameState(gameId);

    if (gameQuery.isLoading || !gameQuery.data) return <h1>Game Loading...</h1>;

    return <GameRenderer game={gameQuery.data} user={user} />;
};

export const PlayPage = () => {
    const user = useUser();

    if (!user) return <Navigate to="/login" />;
    if (!user.currentGameId) return <Navigate to="/matchmaking" />;

    return <Game user={user} gameId={user.currentGameId} />;
};
