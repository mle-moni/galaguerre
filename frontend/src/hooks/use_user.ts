import type { ApiUser } from "#api_types/auth.types";
import { createContext, useContext } from "react";
import { useApiQuery } from "~/hooks/use_api_query";
import { authenticateSocket } from "~/services/ws_client";
import { fetchCurrentUser } from "~/services/fetch_current_user";

export const USER_QUERY_KEY = ["user"];

export const useUserQuery = () => {
    const query = useApiQuery({
        queryKey: USER_QUERY_KEY,
        queryFn: async () => {
            const user = await fetchCurrentUser();

            authenticateSocket(user);

            return user;
        },
        showErrorToast: false,
    });

    return query;
};

export const UserContext = createContext<ApiUser | null>(null);

export const useUser = () => {
    const user = useContext(UserContext);

    return user;
};
