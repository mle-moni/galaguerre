import type { ApiUser } from "#api_types/auth.types";

import { Navigate } from "react-router-dom";
import { CenteredLoader } from "~/components/centered_loader";
import { useDimensions } from "~/hooks/use_dimensions";
import { useGameState } from "~/hooks/use_game_state";
import { useUser } from "~/hooks/use_user";
import { GameRenderer } from "./game_renderer.js";

interface GameProps {
    user: ApiUser;
    gameId: number;
}

const Game = ({ gameId, user }: GameProps) => {
    const gameQuery = useGameState(gameId);

    if (gameQuery.isLoading || !gameQuery.data) return <CenteredLoader absolute />;

    return <GameRenderer game={gameQuery.data} user={user} />;
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
