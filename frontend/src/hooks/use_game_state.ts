import type { ApiGame } from "#api_types/game.types";
import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useMemo } from "react";
import { _assert } from "~/helpers/assertions";
import { GameStore } from "~/pages/play/GameStore";
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
    const user = useUser();
    const game = useContext(GameStateContext);

    _assert(game, "You must call this from within a GameStateContext provider");
    _assert(user, "You must be authenticated to use this hook");

    const store = useMemo(() => new GameStore(game, user), [game, user]);

    return { game, store };
};

export const useIsMyTurn = () => {
    const { game } = useGameContext();
    const user = useUser();
    const gameState = game.data.state;
    const p1 = game.data.playerOne;
    const p2 = game.data.playerTwo;

    if (gameState === "PLAYER_ONE_TURN") {
        return p1.userId === user?.id;
    }

    if (gameState === "PLAYER_TWO_TURN") {
        return p2.userId === user?.id;
    }

    return false;
};
