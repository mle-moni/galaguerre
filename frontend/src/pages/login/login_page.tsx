import { Button, PasswordInput, TextInput } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import { observer } from "mobx-react-lite";
import { Link, Navigate } from "react-router-dom";
import { AuthLayout } from "~/components/layout/auth_layout";
import { useApiMutation } from "~/hooks/use_api_mutation";
import { USER_QUERY_KEY } from "~/hooks/use_user";
import { useUser } from "~/hooks/use_user";
import { client, setToken } from "~/services/client";
import { CUELUME_BUTTON } from "~/cuelume/sound_props";

export const LoginPage = observer(() => {
    const user = useUser();
    const queryClient = useQueryClient();

    const loginMutation = useApiMutation({
        mutationFn: async (data: { email: string; password: string }) => {
            return client.api.auth.login({ body: data });
        },
        onSuccess: async (data) => {
            setToken(data.token);
            await queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
        },
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        loginMutation.mutate({
            email: formData.get("email") as string,
            password: formData.get("password") as string,
        });
    };

    if (user) return <Navigate to="/" />;

    return (
        <AuthLayout
            title="Connexion"
            subtitle="Connectez-vous pour jouer"
            footer={
                <>
                    Pas encore de compte ?{" "}
                    <Link to="/register" className="text-gg-gold font-semibold">
                        Créer un compte
                    </Link>
                    <br />
                    <Link to="/leaderboard" className="text-gg-gold font-semibold">
                        Voir le classement
                    </Link>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <TextInput
                    label="Email"
                    name="email"
                    type="email"
                    required
                    styles={{ label: { color: "rgba(255,255,255,0.8)" } }}
                />
                <PasswordInput
                    label="Mot de passe"
                    name="password"
                    required
                    styles={{ label: { color: "rgba(255,255,255,0.8)" } }}
                />
                <Button
                    type="submit"
                    className="gg-btn-primary mt-2"
                    loading={loginMutation.isPending}
                    fullWidth
                    {...CUELUME_BUTTON}
                >
                    Se connecter
                </Button>
            </form>
        </AuthLayout>
    );
});
