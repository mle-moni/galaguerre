import "../play/play_page.css";
import "../play/game_layout.css";

import { Alert } from "@mantine/core";
import { IconEye } from "@tabler/icons-react";
import clsx from "clsx";
import { useEffect } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { AppLayoutFrame } from "~/components/layout/app_layout";
import { useBoardMinionVariant } from "~/hooks/use_board_minion_variant";
import { useSpectateWatch } from "~/hooks/use_spectate_watch";
import { Game } from "~/pages/play/play_page";
import { useUser } from "~/hooks/use_user";

const SPECTATE_REFETCH_INTERVAL_MS = 2000;

export const SpectatePage = () => {
    const user = useUser();
    const boardMinionVariant = useBoardMinionVariant();
    const { gameId: gameIdParam } = useParams();
    const [searchParams] = useSearchParams();
    const gameId = Number(gameIdParam);
    const asUserId = Number(searchParams.get("asUserId"));

    useEffect(() => {
        document.documentElement.classList.add("play-page-active");
        return () => {
            document.documentElement.classList.remove("play-page-active");
        };
    }, []);

    const canWatch =
        Number.isFinite(gameId) && gameId > 0 && Number.isFinite(asUserId) && asUserId > 0;
    useSpectateWatch(gameId, asUserId, canWatch);

    if (!user) return <Navigate to="/login" />;

    if (!Number.isFinite(gameId) || gameId <= 0) {
        return (
            <AppLayoutFrame>
                <div className="max-w-3xl mx-auto w-full">
                    <Alert color="red" icon={<IconEye size={18} />}>
                        Partie invalide.
                    </Alert>
                </div>
            </AppLayoutFrame>
        );
    }

    if (!Number.isFinite(asUserId) || asUserId <= 0) {
        return (
            <AppLayoutFrame>
                <div className="max-w-3xl mx-auto w-full">
                    <Alert color="red" icon={<IconEye size={18} />}>
                        Joueur à observer requis.
                    </Alert>
                </div>
            </AppLayoutFrame>
        );
    }

    return (
        <div
            className={clsx(
                "play-page",
                boardMinionVariant === "rect" && "board-minion-variant--rect",
            )}
        >
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
                spectatingAsUserId={asUserId}
                refetchInterval={SPECTATE_REFETCH_INTERVAL_MS}
            />
        </div>
    );
};
