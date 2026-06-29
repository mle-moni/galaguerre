import type { ApiGame } from "#api_types/game.types";
import { useQuery } from "@tanstack/react-query";
import { createContext, useContext } from "react";
import { _assert } from "~/helpers/assertions";
import { privateAxios } from "~/services/axios";
import { GAME_STORE } from "~/stores/store_singletons";
import type { GameStore } from "~/stores/GameStore";
import type { ReplayStore } from "~/stores/ReplayStore";
import { useUser } from "./use_user.js";

export const ReplayStoreContext = createContext<ReplayStore | null>(null);

export const getGameStateQueryKey = (gameId: number) => ["gameState", gameId];

export const useGameState = (gameId: number, options: { refetchInterval?: number } = {}) => {
    const query = useQuery({
        queryKey: getGameStateQueryKey(gameId),
        queryFn: async () => {
            const response = await privateAxios.get<ApiGame>(`/api/games/${gameId}`);

            return response.data;
        },
        refetchInterval: options.refetchInterval,
        refetchOnWindowFocus: true,
    });

    return query;
};

export const GameStateContext = createContext<ApiGame | null>(null);

export const useGameContext = () => {
    const replayStore = useContext(ReplayStoreContext);
    if (replayStore) {
        return {
            game: replayStore.displayGame,
            authoritativeGame: replayStore.authoritativeGame,
            store: replayStore as unknown as GameStore,
        };
    }

    const user = useUser();
    const contextGame = useContext(GameStateContext);

    _assert(contextGame, "You must call this from within a GameStateContext provider");
    _assert(user, "You must be authenticated to use this hook");

    return {
        game: GAME_STORE.displayGame,
        authoritativeGame: GAME_STORE.authoritativeGame,
        store: GAME_STORE,
    };
};
