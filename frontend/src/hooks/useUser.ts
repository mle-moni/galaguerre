import type { ApiUser } from "#api_types/auth.types";
import { useQuery } from "@tanstack/react-query";
import { privateAxios } from "~/services/axios";

export const useUser = () => {
    const res = useQuery({
        queryKey: ["user"],
        queryFn: async () => {
            const response = await privateAxios.get<ApiUser>("/api/auth/me");

            return response.data;
        },
    });

    const { data: user, isLoading, isError } = res;

    return { user, isLoading, isError };
};
