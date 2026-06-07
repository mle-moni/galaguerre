import { Table } from "@mantine/core";
import { observer } from "mobx-react-lite";
import { AppLayout } from "~/components/layout/app_layout";
import { CenteredLoader } from "~/components/centered_loader";
import { PlayerNameLink } from "~/components/player_name_link";
import { useLeaderboardQuery } from "~/hooks/use_leaderboard";
import { useUser } from "~/hooks/use_user";

export const LeaderboardPage = observer(() => {
    const user = useUser();
    const leaderboardQuery = useLeaderboardQuery();

    if (leaderboardQuery.isLoading) return <CenteredLoader absolute />;

    const entries = leaderboardQuery.data ?? [];

    return (
        <AppLayout title="Classement" backTo="/" backLabel="Accueil">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-2xl font-bold text-gg-navy m-0 mb-6">Classement Elo</h1>

                {entries.length === 0 ? (
                    <div className="gg-panel p-8 text-center">
                        <p className="text-white/80 m-0">Aucune partie classée pour le moment.</p>
                    </div>
                ) : (
                    <div className="gg-panel overflow-hidden">
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
                                    <Table.Th>Rang</Table.Th>
                                    <Table.Th>Joueur</Table.Th>
                                    <Table.Th>Elo</Table.Th>
                                    <Table.Th>V / D</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {entries.map((entry) => {
                                    const isCurrentUser = user?.id === entry.userId;

                                    return (
                                        <Table.Tr
                                            key={entry.userId}
                                            style={
                                                isCurrentUser
                                                    ? {
                                                          backgroundColor:
                                                              "rgba(212, 175, 55, 0.15)",
                                                      }
                                                    : undefined
                                            }
                                        >
                                            <Table.Td>#{entry.rank}</Table.Td>
                                            <Table.Td>
                                                <PlayerNameLink
                                                    pseudo={entry.pseudo}
                                                    userId={entry.userId}
                                                    className="text-white no-underline hover:underline"
                                                />
                                                {isCurrentUser && (
                                                    <span className="text-gg-gold text-xs ml-2">
                                                        (vous)
                                                    </span>
                                                )}
                                            </Table.Td>
                                            <Table.Td>{entry.elo}</Table.Td>
                                            <Table.Td>
                                                {entry.wins} / {entry.losses}
                                            </Table.Td>
                                        </Table.Tr>
                                    );
                                })}
                            </Table.Tbody>
                        </Table>
                    </div>
                )}
            </div>
        </AppLayout>
    );
});
