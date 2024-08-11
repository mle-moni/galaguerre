import { useMutation } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { getUserData } from "~/hooks/use_user";
import { privateAxios, setToken } from "~/services/axios";
import { queryClient } from "~/services/query_client";

export const LoginPage = () => {
    const user = getUserData();
    const loginMutation = useMutation({
        mutationFn: async (data: FormData) => {
            const response = await privateAxios.post("/api/auth/login", data);

            return response.data;
        },
        onSuccess: (data) => {
            setToken(data.token);
            queryClient.clear();
        },
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        loginMutation.mutate(formData);
    };

    if (user) return <Navigate to="/" />;

    return (
        <form onSubmit={handleSubmit}>
            <input type="email" name="email" />
            <input type="password" name="password" />
            <button disabled={loginMutation.isPending} type="submit">
                Login
            </button>
        </form>
    );
};
