import "./play_page.css";
import "./game_layout.css";

import type { ApiUser } from "#api_types/auth.types";

import { Alert } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { CenteredLoader } from "~/components/centered_loader";
import { ConnectionBanner } from "~/components/connection_banner";
import { OnboardingGameProvider } from "~/hooks/use_onboarding_game";
import { useBoardMinionVariant } from "~/hooks/use_board_minion_variant";
import { GameStateContext, useGameState } from "~/hooks/use_game_state";
import { useIsSocketReady } from "~/hooks/use_socket_connection";
import { useUser } from "~/hooks/use_user";
import { GAME_STORE } from "~/stores/store_singletons";
import { GameRenderer } from "./game_renderer.js";

interface GameProps {
    user: ApiUser;
    gameId: number;
    spectating?: boolean;
    refetchInterval?: number;
}

export const Game = ({ gameId, user, spectating = false, refetchInterval }: GameProps) => {
    const gameQuery = useGameState(gameId, { refetchInterval });
    const isSocketReady = useIsSocketReady();
    const [isStoreInit, setIsStoreInit] = useState(false);

    useEffect(() => {
        if (!gameQuery.data) return;

        GAME_STORE.syncFromQuery(gameQuery.data, user, { spectating });
        setIsStoreInit(true);
    }, [gameQuery.data, spectating, user]);

    if (gameQuery.isError) {
        return (
            <div className="flex h-full items-center justify-center p-4">
                <Alert color="red" icon={<IconAlertCircle size={18} />}>
                    Impossible de charger cette partie.
                </Alert>
            </div>
        );
    }

    if (gameQuery.isLoading || !gameQuery.data || !isStoreInit) return <CenteredLoader absolute />;

    const isOnboardingGame =
        (gameQuery.data.data.isTraining ?? false) && !user.onboardingCompletedAt;

    return (
        <OnboardingGameProvider value={isOnboardingGame}>
            <GameStateContext.Provider value={gameQuery.data}>
                <div
                    className={clsx(
                        "h-full",
                        !spectating && !isSocketReady && "play-page--offline",
                    )}
                >
                    <GameRenderer game={gameQuery.data} user={user} spectating={spectating} />
                </div>
            </GameStateContext.Provider>
        </OnboardingGameProvider>
    );
};

export const PlayPage = () => {
    const user = useUser();
    const boardMinionVariant = useBoardMinionVariant();
    const [activeGameId, setActiveGameId] = useState<number | null>(
        () => user?.currentGameId ?? null,
    );

    useEffect(() => {
        if (user?.currentGameId) {
            setActiveGameId(user.currentGameId);
        }
    }, [user?.currentGameId]);

    useEffect(() => {
        document.documentElement.classList.add("play-page-active");
        return () => {
            document.documentElement.classList.remove("play-page-active");
        };
    }, []);

    if (!user) return <Navigate to="/login" />;
    if (!activeGameId) return <Navigate to="/matchmaking" />;

    return (
        <div
            className={clsx(
                "play-page",
                boardMinionVariant === "rect" && "board-minion-variant--rect",
            )}
        >
            <ConnectionBanner />
            <Game user={user} gameId={activeGameId} />
        </div>
    );
};
