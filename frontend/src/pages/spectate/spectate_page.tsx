import "../play/play_page.css";
import "../play/game_layout.css";

import { Alert } from "@mantine/core";
import { IconEye } from "@tabler/icons-react";
import { useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import { AppLayout } from "~/components/layout/app_layout";
import { Game } from "~/pages/play/play_page";
import { useUser } from "~/hooks/use_user";

const SPECTATE_REFETCH_INTERVAL_MS = 2000;

export const SpectatePage = () => {
    const user = useUser();
    const { gameId: gameIdParam } = useParams();
    const gameId = Number(gameIdParam);

    useEffect(() => {
        document.documentElement.classList.add("play-page-active");
        return () => {
            document.documentElement.classList.remove("play-page-active");
        };
    }, []);

    if (!user) return <Navigate to="/login" />;

    if (!Number.isFinite(gameId) || gameId <= 0) {
        return (
            <AppLayout title="Spectateur" backTo="/friends" backLabel="Amis">
                <div className="max-w-3xl mx-auto w-full">
                    <Alert color="red" icon={<IconEye size={18} />}>
                        Partie invalide.
                    </Alert>
                </div>
            </AppLayout>
        );
    }

    return (
        <div className="play-page">
            <div className="absolute left-3 top-3 z-50 rounded bg-gg-navy px-3 py-2 text-white shadow-md">
                <span className="inline-flex items-center gap-2 text-sm font-semibold">
                    <IconEye size={16} />
                    Spectateur
                </span>
            </div>
            <Game
                user={user}
                gameId={gameId}
                spectating
                refetchInterval={SPECTATE_REFETCH_INTERVAL_MS}
            />
        </div>
    );
};
