import type { ApiGame } from "#api_types/game.types";
import { useQuery } from "@tanstack/react-query";
import { createContext, useContext } from "react";
import { _assert } from "~/helpers/assertions";
import { privateAxios } from "~/services/axios";
import { GAME_STORE } from "~/stores/store_singletons";
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

    return { game, store: GAME_STORE };
};
