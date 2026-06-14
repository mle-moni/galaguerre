import type { ApiUser } from "#api_types/auth.types";
import { useQuery } from "@tanstack/react-query";
import { createContext, useContext } from "react";
import { authenticateSocket } from "~/services/ws_client";
import { fetchCurrentUser } from "~/services/fetch_current_user";

export const USER_QUERY_KEY = ["user"];

export const useUserQuery = () => {
    const query = useQuery({
        queryKey: USER_QUERY_KEY,
        queryFn: async () => {
            const user = await fetchCurrentUser();

            authenticateSocket(user);

            return user;
        },
    });

    return query;
};

export const UserContext = createContext<ApiUser | null>(null);

export const useUser = () => {
    const user = useContext(UserContext);

    return user;
};
