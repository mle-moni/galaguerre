import { useApiQuery } from "~/hooks/use_api_query";
import { client } from "~/services/client";
import { PRESENCE_HEARTBEAT_INTERVAL_MS } from "~/services/presence";
import { useUser } from "./use_user.js";

export const ACTIVE_GAMES_COUNT_QUERY_KEY = ["games", "active-count"] as const;

export const useActiveGamesCountQuery = () => {
    const user = useUser();

    return useApiQuery({
        queryKey: ACTIVE_GAMES_COUNT_QUERY_KEY,
        queryFn: async () => {
            return client.api.games.activeCount({});
        },
        enabled: !!user,
        refetchInterval: PRESENCE_HEARTBEAT_INTERVAL_MS,
    });
};
