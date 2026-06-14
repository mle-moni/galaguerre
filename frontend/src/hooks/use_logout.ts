import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { privateAxios, TOKEN_STORAGE_KEY } from "~/services/axios";
import { CLIENT_SOCKET, markSocketDisconnected, setSocketAuthSuccess } from "~/services/ws_client";
import { USER_QUERY_KEY } from "./use_user.js";

export const useLogout = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    return useMutation({
        mutationFn: async () => {
            if (CLIENT_SOCKET.connected) {
                CLIENT_SOCKET.emit("logout");
            }

            await privateAxios.post("/api/auth/logout");
        },
        onSettled: () => {
            CLIENT_SOCKET.disconnect();
            setSocketAuthSuccess(false);
            markSocketDisconnected();
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            queryClient.setQueryData(USER_QUERY_KEY, null);
            queryClient.clear();
            navigate("/login");
        },
    });
};
