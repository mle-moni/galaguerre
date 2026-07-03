import type { GameHistoryResult } from "#api_types/game_history.types";
import { Button, Stack, Text } from "@mantine/core";
import { observer } from "mobx-react-lite";
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { GameStatsTable } from "~/components/game_stats_table";
import { CenteredLoader } from "~/components/centered_loader";
import { PlayerNameLink } from "~/components/player_name_link";
import { useGameHistoryDetailQuery } from "~/hooks/use_game_history";
import { useUser } from "~/hooks/use_user";
import { formatGameDuration } from "~/helpers/format_game_duration";

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

    const detail = detailQuery.data;
    const isDraw = detail?.result === "DRAW";
    const winner = useMemo(() => {
        if (!detail || detail.winnerId === null) {
            return null;
        }

        if (detail.winnerId === detail.player.userId) {
            return detail.player;
        }

        return detail.opponent;
    }, [detail]);

    if (!Number.isFinite(userId) || userId <= 0 || !Number.isFinite(gameId) || gameId <= 0) {
        return (
            <div className="gg-panel p-8 text-center max-w-3xl mx-auto">
                <p className="text-white/80 m-0">Partie invalide.</p>
            </div>
        );
    }

    if (detailQuery.isLoading) return <CenteredLoader absolute />;

    if (detailQuery.isError || !detailQuery.data || !detail) {
        return (
            <div className="gg-panel p-8 text-center max-w-3xl mx-auto">
                <p className="text-white/80 m-0">Partie introuvable.</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-xl sm:text-2xl font-bold text-white m-0 mb-6">
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
                        {formatGameDuration(detail.createdAt, detail.finishedAt)} —{" "}
                        {detail.roundCount} tours
                    </Text>

                    {isDraw && (
                        <Text size="sm" c="dimmed">
                            Match nul — Elo inchangé
                        </Text>
                    )}

                    <GameStatsTable
                        playerA={detail.player}
                        playerB={detail.opponent}
                        winnerUserId={detail.winnerId}
                        highlightUserId={currentUser?.id}
                        linkToHistory
                        onDarkBackground
                    />

                    {detail.hasReplay && (
                        <Button
                            component={Link}
                            to={`/game-history/${userId}/${gameId}/replay`}
                            variant="light"
                            mt="sm"
                        >
                            Voir le replay
                        </Button>
                    )}
                </Stack>
            </div>
        </div>
    );
});
