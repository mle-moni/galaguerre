import type { ApiFriend, ApiFriendSearchResult } from "#api_types/friend.types";
import { ActionIcon, Badge, Table, TextInput, Tooltip } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconEye, IconSearch } from "@tabler/icons-react";
import { observer } from "mobx-react-lite";
import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { FriendActionButton } from "~/components/friends/friend_action_button";
import { AppLayout } from "~/components/layout/app_layout";
import { CenteredLoader } from "~/components/centered_loader";
import { PlayerNameLink } from "~/components/player_name_link";
import { ResponsiveTable } from "~/components/responsive_table";
import { useFriendSearchQuery, useFriendsQuery } from "~/hooks/use_friends";
import { useUser } from "~/hooks/use_user";

const tableStyles = {
    th: { color: "rgba(255,255,255,0.7)", fontWeight: 600 },
    td: { color: "white" },
};

const FriendStats = ({ user }: { user: ApiFriend }) => (
    <span className="text-white/70 text-sm">
        {user.elo} Elo · {user.wins}V / {user.losses}D
    </span>
);

const FriendRow = ({
    entry,
    isFriend,
    onSpectate,
}: {
    entry: ApiFriend | ApiFriendSearchResult;
    isFriend: boolean;
    onSpectate: (gameId: number) => void;
}) => (
    <Table.Tr>
        <Table.Td>
            <div className="flex flex-col gap-1">
                <span className="inline-flex items-center gap-2">
                    <PlayerNameLink
                        pseudo={entry.pseudo}
                        userId={entry.userId}
                        className="text-white no-underline hover:underline"
                    />
                    {isFriend && (
                        <Badge color="gold" size="xs" variant="light">
                            Ami
                        </Badge>
                    )}
                    {isFriend && entry.currentGameId && (
                        <Badge color="green" size="xs" variant="light">
                            En partie
                        </Badge>
                    )}
                </span>
                <FriendStats user={entry} />
            </div>
        </Table.Td>
        <Table.Td ta="right">
            <span className="inline-flex items-center justify-end gap-2">
                {isFriend && entry.currentGameId && (
                    <Tooltip label="Regarder la partie" withArrow>
                        <ActionIcon
                            aria-label="Regarder la partie"
                            color="navy"
                            onClick={() => {
                                if (entry.currentGameId) onSpectate(entry.currentGameId);
                            }}
                            variant="filled"
                        >
                            <IconEye size={16} />
                        </ActionIcon>
                    </Tooltip>
                )}
                <FriendActionButton userId={entry.userId} isFriend={isFriend} />
            </span>
        </Table.Td>
    </Table.Tr>
);

export const FriendsPage = observer(() => {
    const user = useUser();
    const navigate = useNavigate();
    const [search, setSearch] = useState("");
    const [debouncedSearch] = useDebouncedValue(search.trim(), 250);
    const friendsQuery = useFriendsQuery();
    const searchQuery = useFriendSearchQuery(debouncedSearch);
    const friends = friendsQuery.data ?? [];
    const friendIds = useMemo(() => new Set(friends.map((friend) => friend.userId)), [friends]);
    const searchResults = searchQuery.data ?? [];

    if (!user) return <Navigate to="/login" />;

    return (
        <AppLayout title="Amis" backTo="/" backLabel="Accueil">
            <div className="max-w-4xl mx-auto w-full">
                <h1 className="text-xl sm:text-2xl font-bold text-gg-navy m-0 mb-6">Amis</h1>

                <div className="gg-panel mb-6">
                    <div className="gg-panel-header">Rechercher un joueur</div>
                    <div className="gg-panel-body flex flex-col gap-4">
                        <TextInput
                            aria-label="Rechercher par pseudo"
                            leftSection={<IconSearch size={16} />}
                            onChange={(event) => setSearch(event.currentTarget.value)}
                            placeholder="Pseudo"
                            value={search}
                        />

                        {debouncedSearch.length >= 2 && searchQuery.isFetching && (
                            <CenteredLoader />
                        )}

                        {debouncedSearch.length >= 2 && !searchQuery.isFetching && (
                            <>
                                {searchResults.length === 0 ? (
                                    <p className="text-white/70 m-0">Aucun joueur trouvé.</p>
                                ) : (
                                    <ResponsiveTable minWidth={360}>
                                        <Table
                                            highlightOnHover
                                            highlightOnHoverColor="rgba(255, 255, 255, 0.1)"
                                            striped
                                            stripedColor="rgba(255, 255, 255, 0.06)"
                                            styles={tableStyles}
                                            withTableBorder={false}
                                        >
                                            <Table.Tbody>
                                                {searchResults.map((entry) => (
                                                    <FriendRow
                                                        key={entry.userId}
                                                        entry={entry}
                                                        isFriend={
                                                            entry.isFriend ||
                                                            friendIds.has(entry.userId)
                                                        }
                                                        onSpectate={(gameId) =>
                                                            navigate(`/spectate/${gameId}`)
                                                        }
                                                    />
                                                ))}
                                            </Table.Tbody>
                                        </Table>
                                    </ResponsiveTable>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <div className="gg-panel overflow-hidden">
                    <div className="gg-panel-header">Mes amis</div>
                    {friendsQuery.isLoading ? (
                        <div className="gg-panel-body">
                            <CenteredLoader />
                        </div>
                    ) : friends.length === 0 ? (
                        <div className="gg-panel-body">
                            <p className="text-white/70 m-0">
                                Vous n'avez pas encore ajouté d'ami.
                            </p>
                        </div>
                    ) : (
                        <ResponsiveTable minWidth={360}>
                            <Table
                                highlightOnHover
                                highlightOnHoverColor="rgba(255, 255, 255, 0.1)"
                                striped
                                stripedColor="rgba(255, 255, 255, 0.06)"
                                styles={tableStyles}
                                withTableBorder={false}
                            >
                                <Table.Tbody>
                                    {friends.map((friend) => (
                                        <FriendRow
                                            key={friend.userId}
                                            entry={friend}
                                            isFriend={friendIds.has(friend.userId)}
                                            onSpectate={(gameId) => navigate(`/spectate/${gameId}`)}
                                        />
                                    ))}
                                </Table.Tbody>
                            </Table>
                        </ResponsiveTable>
                    )}
                </div>
            </div>
        </AppLayout>
    );
});
