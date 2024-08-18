import type { ApiGame } from "#api_types/game.types";
import { useQuery } from "@tanstack/react-query";
import { createContext, useContext } from "react";
import { privateAxios } from "~/services/axios";
import { useUser } from "./use_user.js";

export const getGameStateQueryKey = (gameId: number) => ["gameState", gameId];

export const useGameState = (gameId: number) => {
    const query = useQuery({
        queryKey: getGameStateQueryKey(gameId),
        queryFn: async () => {
            const response = await privateAxios.get<ApiGame>(`/api/games/${gameId}`);

            return response.data;
        },
    });

    return query;
};

export const GameStateContext = createContext<ApiGame | null>(null);

export const useGameContext = () => {
    const apiGame = useContext(GameStateContext);

    if (!apiGame) throw new Error("You must call this from within a GameStateContext provider");

    return apiGame;
};

export const useIsMyTurn = () => {
    const apiGame = useGameContext();
    const user = useUser();
    const gameState = apiGame.data.state;
    const p1 = apiGame.data.playerOne;
    const p2 = apiGame.data.playerTwo;

    if (gameState === "PLAYER_ONE_TURN") {
        return p1.userId === user?.id;
    }

    if (gameState === "PLAYER_TWO_TURN") {
        return p2.userId === user?.id;
    }

    return false;
};
