import { Button, PasswordInput, TextInput } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import { observer } from "mobx-react-lite";
import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { AuthLayout } from "~/components/layout/auth_layout";
import { useApiMutation } from "~/hooks/use_api_mutation";
import { USER_QUERY_KEY, useUser } from "~/hooks/use_user";
import { client, setToken } from "~/services/client";
import { notifyError } from "~/services/toasts";

export const RegisterPage = observer(() => {
    const user = useUser();
    const queryClient = useQueryClient();
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const [redirectTo, setRedirectTo] = useState<string | null>(null);

    const registerMutation = useApiMutation({
        mutationFn: async (data: { email: string; password: string; pseudo: string }) => {
            return client.api.auth.register({ body: data });
        },
        onSuccess: async (data) => {
            setToken(data.token);
            await queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
            setRedirectTo("/onboarding");
        },
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const password = formData.get("password") as string;

        if (password !== passwordConfirm) {
            notifyError("Les mots de passe ne correspondent pas");
            return;
        }

        registerMutation.mutate({
            email: formData.get("email") as string,
            password,
            pseudo: formData.get("pseudo") as string,
        });
    };

    if (redirectTo) return <Navigate to={redirectTo} replace />;
    if (user) return <Navigate to="/" replace />;

    return (
        <AuthLayout
            title="Créer un compte"
            subtitle="Rejoignez l'arène Galaguerre"
            footer={
                <>
                    Déjà un compte ?{" "}
                    <Link to="/login" className="text-gg-gold font-semibold">
                        Se connecter
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
                    label="Pseudo"
                    name="pseudo"
                    required
                    styles={{ label: { color: "rgba(255,255,255,0.8)" } }}
                />
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
                <PasswordInput
                    label="Confirmer le mot de passe"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.currentTarget.value)}
                    required
                    styles={{ label: { color: "rgba(255,255,255,0.8)" } }}
                />
                <Button
                    type="submit"
                    className="gg-btn-primary mt-2"
                    loading={registerMutation.isPending}
                    fullWidth
                >
                    Créer mon compte
                </Button>
            </form>
        </AuthLayout>
    );
});
