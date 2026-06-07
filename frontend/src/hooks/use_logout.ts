import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { privateAxios, TOKEN_STORAGE_KEY } from "~/services/axios";
import { USER_QUERY_KEY } from "./use_user.js";

export const useLogout = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    return useMutation({
        mutationFn: async () => {
            await privateAxios.post("/api/auth/logout");
        },
        onSettled: () => {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            queryClient.setQueryData(USER_QUERY_KEY, null);
            queryClient.clear();
            navigate("/login");
        },
    });
};
