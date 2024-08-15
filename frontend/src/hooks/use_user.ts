import type { ApiUser } from "#api_types/auth.types";
import { useQuery } from "@tanstack/react-query";
import { createContext, useContext } from "react";
import { privateAxiosWithoutToasts } from "~/services/axios";
import { authenticateSocket } from "~/services/ws_client";

export const USER_QUERY_KEY = ["user"];

export const useUserQuery = () => {
    const query = useQuery({
        queryKey: USER_QUERY_KEY,
        queryFn: async () => {
            const response = await privateAxiosWithoutToasts.get<ApiUser>("/api/auth/me");

            authenticateSocket(response.data);

            return response.data;
        },
    });

    return query;
};

export const UserContext = createContext<ApiUser | null>(null);

export const useUser = () => {
    const user = useContext(UserContext);

    return user;
};
