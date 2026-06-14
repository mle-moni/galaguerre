import type { ApiUser } from "#api_types/auth.types";
import { privateAxiosWithoutToasts } from "./axios.js";

export const fetchCurrentUser = async (): Promise<ApiUser> => {
    const response = await privateAxiosWithoutToasts.get<ApiUser>("/api/auth/me");

    return response.data;
};
