import type { ApiGameHistoryEntry, GameHistoryResult } from "#api_types/game_history.types";
import { Badge, Table } from "@mantine/core";
import { observer } from "mobx-react-lite";
import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FriendActionButton } from "~/components/friends/friend_action_button";
import { AppLayout } from "~/components/layout/app_layout";
import { CenteredLoader } from "~/components/centered_loader";
import { ResponsiveTable } from "~/components/responsive_table";
import { PlayerNameLink } from "~/components/player_name_link";
import { useFriendsQuery } from "~/hooks/use_friends";
import { useGameHistoryListQuery } from "~/hooks/use_game_history";
import { useUser } from "~/hooks/use_user";

const formatEloDelta = (delta: number | null) => {
    if (delta === null) return "—";
    return delta > 0 ? `+${delta}` : `${delta}`;
};

const formatDate = (isoDate: string) =>
    new Date(isoDate).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

const RESULT_LABELS: Record<GameHistoryResult, string> = {
    WIN: "Victoire",
    LOSS: "Défaite",
    DRAW: "Nul",
};

const RESULT_COLORS: Record<GameHistoryResult, string> = {
    WIN: "green",
    LOSS: "red",
    DRAW: "gray",
};

const ResultBadge = ({ result }: { result: GameHistoryResult }) => (
    <Badge color={RESULT_COLORS[result]} variant="light">
        {RESULT_LABELS[result]}
    </Badge>
);

const GameHistoryRow = ({
    entry,
    friendIds,
    onSelect,
}: {
    entry: ApiGameHistoryEntry;
    friendIds: Set<number>;
    onSelect: (gameId: number) => void;
}) => (
    <Table.Tr style={{ cursor: "pointer" }} onClick={() => onSelect(entry.gameId)}>
        <Table.Td>{formatDate(entry.finishedAt)}</Table.Td>
        <Table.Td>
            <span className="inline-flex items-center gap-2">
                <PlayerNameLink
                    pseudo={entry.opponentPseudo}
                    userId={entry.opponentUserId}
                    className="text-white no-underline hover:underline"
                    stopPropagation
                />
                <FriendActionButton
                    userId={entry.opponentUserId}
                    isFriend={friendIds.has(entry.opponentUserId)}
                />
            </span>
        </Table.Td>
        <Table.Td>
            <ResultBadge result={entry.result} />
        </Table.Td>
        <Table.Td>{formatEloDelta(entry.eloDelta)}</Table.Td>
        <Table.Td className="hidden sm:table-cell">{entry.roundCount}</Table.Td>
    </Table.Tr>
);

export const GameHistoryListPage = observer(() => {
    const navigate = useNavigate();
    const { userId: userIdParam } = useParams();
    const userId = Number(userIdParam);
    const currentUser = useUser();
    const historyQuery = useGameHistoryListQuery(userId);
    const friendsQuery = useFriendsQuery();
    const friendIds = useMemo(
        () => new Set((friendsQuery.data ?? []).map((friend) => friend.userId)),
        [friendsQuery.data],
    );

    if (!Number.isFinite(userId) || userId <= 0) {
        return (
            <AppLayout title="Historique des parties" backTo="/" backLabel="Accueil">
                <div className="gg-panel p-8 text-center max-w-3xl mx-auto">
                    <p className="text-white/80 m-0">Joueur invalide.</p>
                </div>
            </AppLayout>
        );
    }

    if (historyQuery.isLoading) return <CenteredLoader absolute />;

    if (historyQuery.isError || !historyQuery.data) {
        return (
            <AppLayout title="Historique des parties" backTo="/" backLabel="Accueil">
                <div className="gg-panel p-8 text-center max-w-3xl mx-auto">
                    <p className="text-white/80 m-0">Joueur introuvable.</p>
                </div>
            </AppLayout>
        );
    }

    const { user, games } = historyQuery.data;
    const isOwnHistory = currentUser?.id === user.userId;

    return (
        <AppLayout
            title="Historique des parties"
            backTo={isOwnHistory ? "/" : "/leaderboard"}
            backLabel={isOwnHistory ? "Accueil" : "Classement"}
        >
            <div className="max-w-4xl mx-auto">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h1 className="text-xl sm:text-2xl font-bold text-gg-navy m-0">
                        Historique de{" "}
                        <PlayerNameLink
                            pseudo={user.pseudo}
                            userId={user.userId}
                            className="text-gg-navy no-underline hover:underline"
                        />
                        {isOwnHistory && (
                            <span className="text-gg-gold text-base ml-2">(vous)</span>
                        )}
                    </h1>
                    {!isOwnHistory && (
                        <FriendActionButton
                            userId={user.userId}
                            isFriend={friendIds.has(user.userId)}
                            size="md"
                        />
                    )}
                </div>
                <p className="text-gg-navy/70 m-0 mb-6">
                    Elo : {user.elo} — {user.wins}V / {user.losses}D
                </p>

                {games.length === 0 ? (
                    <div className="gg-panel p-8 text-center">
                        <p className="text-white/80 m-0">Aucune partie terminée pour le moment.</p>
                    </div>
                ) : (
                    <div className="gg-panel overflow-hidden">
                        <ResponsiveTable minWidth={520}>
                            <Table
                                striped
                                stripedColor="rgba(255, 255, 255, 0.06)"
                                highlightOnHover
                                highlightOnHoverColor="rgba(255, 255, 255, 0.1)"
                                withTableBorder={false}
                                styles={{
                                    th: { color: "rgba(255,255,255,0.7)", fontWeight: 600 },
                                    td: { color: "white" },
                                }}
                            >
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>Date</Table.Th>
                                        <Table.Th>Adversaire</Table.Th>
                                        <Table.Th>Résultat</Table.Th>
                                        <Table.Th>Elo</Table.Th>
                                        <Table.Th className="hidden sm:table-cell">Tours</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {games.map((entry) => (
                                        <GameHistoryRow
                                            key={entry.gameId}
                                            entry={entry}
                                            friendIds={friendIds}
                                            onSelect={(gameId) =>
                                                navigate(`/game-history/${userId}/${gameId}`)
                                            }
                                        />
                                    ))}
                                </Table.Tbody>
                            </Table>
                        </ResponsiveTable>
                    </div>
                )}

                {currentUser && !isOwnHistory && (
                    <p className="text-gg-navy/60 text-sm mt-4 mb-0">
                        <Link to={`/game-history/${currentUser.id}`} className="text-gg-navy">
                            Voir mon historique
                        </Link>
                    </p>
                )}
            </div>
        </AppLayout>
    );
});
