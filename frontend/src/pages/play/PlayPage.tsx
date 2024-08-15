import type { ApiUser } from "#api_types/auth.types";
import { Navigate } from "react-router-dom";
import { useUser } from "~/hooks/use_user";
import { useGameState } from "./useGameState.js";

interface GameProps {
    user: ApiUser;
    gameId: number;
}

const Game = ({ gameId }: GameProps) => {
    const gameQuery = useGameState(gameId);

    if (gameQuery.isLoading) return <h1>Game Loading...</h1>;

    return <h1>Game {gameQuery.data.id}</h1>;
};

export const PlayPage = () => {
    const user = useUser();

    if (!user) return <Navigate to="/login" />;
    if (!user.currentGameId) return <Navigate to="/matchmaking" />;

    return <Game user={user} gameId={user.currentGameId} />;
};
