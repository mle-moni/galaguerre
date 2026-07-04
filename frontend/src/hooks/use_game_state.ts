import { createContext, useContext } from "react";
import { useApiQuery } from "~/hooks/use_api_query";
import { _assert } from "~/helpers/assertions";
import { client } from "~/services/client";
import { GAME_STORE } from "~/stores/store_singletons";
import type { GameStore } from "~/stores/GameStore";
import type { ReplayStore } from "~/stores/ReplayStore";
import { useUser } from "./use_user.js";

export const ReplayStoreContext = createContext<ReplayStore | null>(null);

export const getGameStateQueryKey = (gameId: number, asUserId?: number) =>
    ["gameState", gameId, asUserId ?? null] as const;

export const useGameState = (
    gameId: number,
    options: { refetchInterval?: number; asUserId?: number } = {},
) => {
    const { asUserId, refetchInterval } = options;

    const query = useApiQuery({
        queryKey: getGameStateQueryKey(gameId, asUserId),
        queryFn: async () => {
            return client.api.games.show({
                params: { id: gameId },
                query: asUserId ? { asUserId } : {},
            });
        },
        refetchInterval,
        refetchOnWindowFocus: true,
    });

    return query;
};

export const GameStateContext = createContext<Awaited<
    ReturnType<typeof client.api.games.show>
> | null>(null);

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
