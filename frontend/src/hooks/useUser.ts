import type { ApiUser } from "#api_types/auth.types";
import { useQuery } from "@tanstack/react-query";
import { privateAxios } from "~/services/axios";

export const useUser = () => {
    const { data: user, isLoading } = useQuery({
        queryKey: ["user"],
        queryFn: async () => {
            const response = await privateAxios.get<ApiUser>("/auth/me");

            return response.data;
        },
    });

    return { user, isLoading };
};
