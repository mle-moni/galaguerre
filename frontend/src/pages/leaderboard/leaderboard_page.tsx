import { Badge, Table, Tabs } from "@mantine/core";
import { observer } from "mobx-react-lite";
import { useMemo, useState } from "react";
import { FriendActionButton } from "~/components/friends/friend_action_button";
import { AppLayout } from "~/components/layout/app_layout";
import { CenteredLoader } from "~/components/centered_loader";
import { ResponsiveTable } from "~/components/responsive_table";
import { PlayerNameLink } from "~/components/player_name_link";
import { formatDurationSeconds } from "~/helpers/format_game_duration";
import { useFriendsQuery } from "~/hooks/use_friends";
import { useAiSpeedrunLeaderboardQuery, useLeaderboardQuery } from "~/hooks/use_leaderboard";
import { useUser } from "~/hooks/use_user";

type LeaderboardTab = "elo" | "ai-speedrun";

const tableStyles = {
    th: { color: "rgba(255,255,255,0.7)", fontWeight: 600 },
    td: { color: "white" },
};

const currentUserRowStyle = {
    backgroundColor: "rgba(212, 175, 55, 0.15)",
};

export const LeaderboardPage = observer(() => {
    const user = useUser();
    const [activeTab, setActiveTab] = useState<LeaderboardTab>("elo");
    const leaderboardQuery = useLeaderboardQuery();
    const speedrunQuery = useAiSpeedrunLeaderboardQuery(activeTab === "ai-speedrun");
    const friendsQuery = useFriendsQuery();
    const friendIds = useMemo(
        () => new Set((friendsQuery.data ?? []).map((friend) => friend.userId)),
        [friendsQuery.data],
    );

    const isLoading = activeTab === "elo" ? leaderboardQuery.isLoading : speedrunQuery.isLoading;

    if (isLoading) return <CenteredLoader absolute />;

    const eloEntries = leaderboardQuery.data ?? [];
    const speedrunEntries = speedrunQuery.data ?? [];

    return (
        <AppLayout title="Classement" backTo="/" backLabel="Accueil">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-xl sm:text-2xl font-bold text-gg-navy m-0 mb-6">Classement</h1>

                <Tabs
                    value={activeTab}
                    onChange={(value) => setActiveTab((value as LeaderboardTab) ?? "elo")}
                    variant="pills"
                    color="navy"
                    classNames={{
                        root: "gg-deck-builder-tabs",
                        panel: "gg-deck-builder-tabs__panel",
                    }}
                >
                    <Tabs.List grow>
                        <Tabs.Tab value="elo">Elo</Tabs.Tab>
                        <Tabs.Tab value="ai-speedrun">AI speedrun</Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="elo" pt="md">
                        {eloEntries.length === 0 ? (
                            <div className="gg-panel p-8 text-center">
                                <p className="text-white/80 m-0">
                                    Aucune partie classée pour le moment.
                                </p>
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
                                        styles={tableStyles}
                                    >
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th>Rang</Table.Th>
                                                <Table.Th>Joueur</Table.Th>
                                                <Table.Th>Elo</Table.Th>
                                                <Table.Th className="hidden sm:table-cell">
                                                    V / D
                                                </Table.Th>
                                                <Table.Th ta="right">Ami</Table.Th>
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {eloEntries.map((entry) => {
                                                const isCurrentUser = user?.id === entry.userId;
                                                const isFriend = friendIds.has(entry.userId);

                                                return (
                                                    <Table.Tr
                                                        key={entry.userId}
                                                        style={
                                                            isCurrentUser
                                                                ? currentUserRowStyle
                                                                : undefined
                                                        }
                                                    >
                                                        <Table.Td>#{entry.rank}</Table.Td>
                                                        <Table.Td>
                                                            <span className="inline-flex items-center gap-2">
                                                                <PlayerNameLink
                                                                    pseudo={entry.pseudo}
                                                                    userId={entry.userId}
                                                                    className="text-white no-underline hover:underline"
                                                                />
                                                                {isFriend && (
                                                                    <Badge
                                                                        color="gold"
                                                                        size="xs"
                                                                        variant="light"
                                                                    >
                                                                        Ami
                                                                    </Badge>
                                                                )}
                                                                {isCurrentUser && (
                                                                    <span className="text-gg-gold text-xs">
                                                                        (vous)
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </Table.Td>
                                                        <Table.Td>{entry.elo}</Table.Td>
                                                        <Table.Td className="hidden sm:table-cell">
                                                            {entry.wins} / {entry.losses}
                                                        </Table.Td>
                                                        <Table.Td ta="right">
                                                            <FriendActionButton
                                                                userId={entry.userId}
                                                                isFriend={isFriend}
                                                            />
                                                        </Table.Td>
                                                    </Table.Tr>
                                                );
                                            })}
                                        </Table.Tbody>
                                    </Table>
                                </ResponsiveTable>
                            </div>
                        )}
                    </Tabs.Panel>

                    <Tabs.Panel value="ai-speedrun" pt="md">
                        {speedrunEntries.length === 0 ? (
                            <div className="gg-panel p-8 text-center">
                                <p className="text-white/80 m-0">
                                    Aucune victoire contre l'IA enregistrée pour le moment.
                                </p>
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
                                        styles={tableStyles}
                                    >
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th>Rang</Table.Th>
                                                <Table.Th>Joueur</Table.Th>
                                                <Table.Th>Temps</Table.Th>
                                                <Table.Th className="hidden sm:table-cell">
                                                    Tours
                                                </Table.Th>
                                                <Table.Th ta="right">Ami</Table.Th>
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {speedrunEntries.map((entry) => {
                                                const isCurrentUser = user?.id === entry.userId;
                                                const isFriend = friendIds.has(entry.userId);

                                                return (
                                                    <Table.Tr
                                                        key={entry.userId}
                                                        style={
                                                            isCurrentUser
                                                                ? currentUserRowStyle
                                                                : undefined
                                                        }
                                                    >
                                                        <Table.Td>#{entry.rank}</Table.Td>
                                                        <Table.Td>
                                                            <span className="inline-flex items-center gap-2">
                                                                <PlayerNameLink
                                                                    pseudo={entry.pseudo}
                                                                    userId={entry.userId}
                                                                    className="text-white no-underline hover:underline"
                                                                />
                                                                {isFriend && (
                                                                    <Badge
                                                                        color="gold"
                                                                        size="xs"
                                                                        variant="light"
                                                                    >
                                                                        Ami
                                                                    </Badge>
                                                                )}
                                                                {isCurrentUser && (
                                                                    <span className="text-gg-gold text-xs">
                                                                        (vous)
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            {formatDurationSeconds(
                                                                entry.durationSeconds,
                                                            )}
                                                        </Table.Td>
                                                        <Table.Td className="hidden sm:table-cell">
                                                            {entry.roundCount} tours
                                                        </Table.Td>
                                                        <Table.Td ta="right">
                                                            <FriendActionButton
                                                                userId={entry.userId}
                                                                isFriend={isFriend}
                                                            />
                                                        </Table.Td>
                                                    </Table.Tr>
                                                );
                                            })}
                                        </Table.Tbody>
                                    </Table>
                                </ResponsiveTable>
                            </div>
                        )}
                    </Tabs.Panel>
                </Tabs>
            </div>
        </AppLayout>
    );
});
