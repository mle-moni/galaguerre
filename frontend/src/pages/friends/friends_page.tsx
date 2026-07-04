import type { ApiFriend, ApiFriendSearchResult } from "#api_types/friend.types";
import { ActionIcon, Badge, Table, TextInput, Tooltip } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconEye, IconSearch } from "@tabler/icons-react";
import { observer } from "mobx-react-lite";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FriendActionButton } from "~/components/friends/friend_action_button";
import { GameInviteButton } from "~/components/friends/game_invite_button";
import { CenteredLoader } from "~/components/centered_loader";
import { PlayerNameLink } from "~/components/player_name_link";
import { ResponsiveTable } from "~/components/responsive_table";
import { useRelativeTimeTick } from "~/hooks/use_relative_time";
import { useFriendSearchQuery, useFriendsQuery } from "~/hooks/use_friends";
import { formatLastSeen } from "~/utils/format_last_seen";

const tableStyles = {
    th: { color: "rgba(255,255,255,0.7)", fontWeight: 600 },
    td: { color: "white" },
};

const FriendStats = ({ user }: { user: ApiFriend }) => (
    <span className="text-white/70 text-sm">
        {user.elo} Elo · {user.wins}V / {user.losses}D
    </span>
);

const FriendLastSeen = ({ friend, tick }: { friend: ApiFriend; tick: number }) => {
    void tick;

    if (friend.isOnline || !friend.lastSeenAt) return null;

    return (
        <span className="text-white/50 text-sm">
            Dernière connexion {formatLastSeen(friend.lastSeenAt)}
        </span>
    );
};

const compareFriends = (left: ApiFriend, right: ApiFriend) => {
    const leftRank = getFriendSortRank(left);
    const rightRank = getFriendSortRank(right);

    if (leftRank !== rightRank) return leftRank - rightRank;

    if (!left.isOnline && !right.isOnline) {
        const leftLastSeen = left.lastSeenAt ? Date.parse(left.lastSeenAt) : 0;
        const rightLastSeen = right.lastSeenAt ? Date.parse(right.lastSeenAt) : 0;
        return rightLastSeen - leftLastSeen;
    }

    return (left.pseudo ?? "").localeCompare(right.pseudo ?? "", "fr");
};

const getFriendSortRank = (friend: ApiFriend) => {
    if (!friend.isOnline) return 2;
    if (friend.currentGameId !== null) return 0;
    return 1;
};

const FriendRow = ({
    entry,
    isFriend,
    onSpectate,
    relativeTimeTick,
}: {
    entry: ApiFriend | ApiFriendSearchResult;
    isFriend: boolean;
    onSpectate: (gameId: number) => void;
    relativeTimeTick: number;
}) => {
    const friendRequestStatus =
        "friendRequestStatus" in entry ? entry.friendRequestStatus : undefined;

    return (
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
                        {isFriend && entry.isOnline && !entry.currentGameId && (
                            <Badge color="green" size="xs" variant="light">
                                En ligne
                            </Badge>
                        )}
                    </span>
                    <FriendStats user={entry} />
                    {isFriend && "isOnline" in entry && (
                        <FriendLastSeen friend={entry} tick={relativeTimeTick} />
                    )}
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
                    {isFriend && "isOnline" in entry && <GameInviteButton friend={entry} />}
                    <FriendActionButton
                        userId={entry.userId}
                        isFriend={isFriend}
                        friendRequestStatus={friendRequestStatus}
                    />
                </span>
            </Table.Td>
        </Table.Tr>
    );
};

export const FriendsPage = observer(() => {
    const navigate = useNavigate();
    const relativeTimeTick = useRelativeTimeTick();
    const [search, setSearch] = useState("");
    const [debouncedSearch] = useDebouncedValue(search.trim(), 250);
    const friendsQuery = useFriendsQuery();
    const searchQuery = useFriendSearchQuery(debouncedSearch);
    const friends = useMemo(
        () => [...(friendsQuery.data ?? [])].sort(compareFriends),
        [friendsQuery.data],
    );
    const friendIds = useMemo(() => new Set(friends.map((friend) => friend.userId)), [friends]);
    const searchResults = searchQuery.data ?? [];

    return (
        <div className="max-w-4xl mx-auto w-full">
            <h1 className="text-xl sm:text-2xl font-bold text-white m-0 mb-6">Amis</h1>

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

                    {debouncedSearch.length >= 2 && searchQuery.isFetching && <CenteredLoader />}

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
                                                    relativeTimeTick={relativeTimeTick}
                                                    onSpectate={(gameId) =>
                                                        navigate(
                                                            `/spectate/${gameId}?asUserId=${entry.userId}`,
                                                        )
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
                        <p className="text-white/70 m-0">Vous n'avez pas encore d'ami.</p>
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
                                        relativeTimeTick={relativeTimeTick}
                                        onSpectate={(gameId) =>
                                            navigate(
                                                `/spectate/${gameId}?asUserId=${friend.userId}`,
                                            )
                                        }
                                    />
                                ))}
                            </Table.Tbody>
                        </Table>
                    </ResponsiveTable>
                )}
            </div>
        </div>
    );
});
