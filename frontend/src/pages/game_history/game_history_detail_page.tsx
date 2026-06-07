import type { GameHistoryResult } from "#api_types/game_history.types";
import { Stack, Text } from "@mantine/core";
import { observer } from "mobx-react-lite";
import { useParams } from "react-router-dom";
import { GameStatsTable } from "~/components/game_stats_table";
import { AppLayout } from "~/components/layout/app_layout";
import { CenteredLoader } from "~/components/centered_loader";
import { PlayerNameLink } from "~/components/player_name_link";
import { useGameHistoryDetailQuery } from "~/hooks/use_game_history";
import { useUser } from "~/hooks/use_user";

const formatEloDelta = (delta: number) => (delta > 0 ? `+${delta}` : `${delta}`);

const formatDate = (isoDate: string) =>
    new Date(isoDate).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

const RESULT_SUMMARY: Record<GameHistoryResult, string> = {
    WIN: "Victoire",
    LOSS: "Défaite",
    DRAW: "Match nul",
};

export const GameHistoryDetailPage = observer(() => {
    const { userId: userIdParam, gameId: gameIdParam } = useParams();
    const userId = Number(userIdParam);
    const gameId = Number(gameIdParam);
    const currentUser = useUser();
    const detailQuery = useGameHistoryDetailQuery(userId, gameId);

    if (!Number.isFinite(userId) || userId <= 0 || !Number.isFinite(gameId) || gameId <= 0) {
        return (
            <AppLayout title="Détail de la partie" backTo="/leaderboard" backLabel="Classement">
                <div className="gg-panel p-8 text-center max-w-3xl mx-auto">
                    <p className="text-white/80 m-0">Partie invalide.</p>
                </div>
            </AppLayout>
        );
    }

    if (detailQuery.isLoading) return <CenteredLoader absolute />;

    if (detailQuery.isError || !detailQuery.data) {
        return (
            <AppLayout
                title="Détail de la partie"
                backTo={`/game-history/${userId}`}
                backLabel="Historique"
            >
                <div className="gg-panel p-8 text-center max-w-3xl mx-auto">
                    <p className="text-white/80 m-0">Partie introuvable.</p>
                </div>
            </AppLayout>
        );
    }

    const detail = detailQuery.data;
    const isDraw = detail.result === "DRAW";
    const winner =
        detail.winnerId === null
            ? null
            : detail.winnerId === detail.player.userId
              ? detail.player
              : detail.opponent;

    return (
        <AppLayout
            title="Détail de la partie"
            backTo={`/game-history/${userId}`}
            backLabel="Historique"
        >
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold text-gg-navy m-0 mb-6">
                    Partie #{detail.gameId}
                </h1>

                <div className="gg-panel p-6">
                    <Stack gap="sm">
                        <Text size="lg" fw={600}>
                            {RESULT_SUMMARY[detail.result]}
                            {!isDraw && winner && (
                                <>
                                    {" — "}
                                    <PlayerNameLink
                                        pseudo={winner.pseudo}
                                        userId={winner.userId}
                                        className="text-inherit no-underline hover:underline"
                                    />{" "}
                                    remporte la partie
                                </>
                            )}
                        </Text>

                        <Text size="sm" c="dimmed">
                            <PlayerNameLink
                                pseudo={detail.player.pseudo}
                                userId={detail.player.userId}
                                className="text-inherit no-underline hover:underline"
                            />
                            {" VS "}
                            <PlayerNameLink
                                pseudo={detail.opponent.pseudo}
                                userId={detail.opponent.userId}
                                className="text-inherit no-underline hover:underline"
                            />
                        </Text>

                        <Text size="sm" c="dimmed">
                            Terminée le {formatDate(detail.finishedAt)} — tour {detail.roundCount}
                        </Text>

                        {isDraw ? (
                            <Text size="sm" c="dimmed">
                                Match nul — Elo inchangé
                            </Text>
                        ) : detail.playerRating ? (
                            <Text size="sm" c="dimmed">
                                {formatEloDelta(detail.playerRating.delta)} Elo pour{" "}
                                <PlayerNameLink
                                    pseudo={detail.player.pseudo}
                                    userId={detail.player.userId}
                                    className="text-inherit no-underline hover:underline"
                                />{" "}
                                — Elo après : {detail.playerRating.eloAfter}
                            </Text>
                        ) : null}

                        <GameStatsTable
                            playerA={detail.player}
                            playerB={detail.opponent}
                            winnerUserId={detail.winnerId}
                            highlightUserId={currentUser?.id}
                            linkToHistory
                            onDarkBackground
                        />
                    </Stack>
                </div>
            </div>
        </AppLayout>
    );
});
