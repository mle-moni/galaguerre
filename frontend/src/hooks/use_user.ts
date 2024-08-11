import type { ApiUser } from "#api_types/auth.types";
import { useQuery } from "@tanstack/react-query";
import { privateAxiosWithoutToasts } from "~/services/axios";
import { queryClient } from "~/services/query_client";

export const useUser = () => {
    const res = useQuery({
        queryKey: ["user"],
        queryFn: async () => {
            const response = await privateAxiosWithoutToasts.get<ApiUser>("/api/auth/me");

            return response.data;
        },
    });

    const { data: user, isLoading, isError } = res;

    return { user, isLoading, isError };
};

export const getUserData = () => {
    return queryClient.getQueryData<ApiUser>(["user"]) ?? null;
};
