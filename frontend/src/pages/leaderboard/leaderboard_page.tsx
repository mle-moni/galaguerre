import type {
    ApiAiSpeedrunLeaderboardEntry,
    ApiLeaderboardEntry,
} from "#api_types/leaderboard.types";
import clsx from "clsx";
import { observer } from "mobx-react-lite";
import { useMemo, useState } from "react";
import { FriendActionButton } from "~/components/friends/friend_action_button";
import { CenteredLoader } from "~/components/centered_loader";
import { PlayerNameLink } from "~/components/player_name_link";
import { UserAvatar } from "~/components/user_avatar";
import { formatSpeedrunDurationSeconds } from "~/helpers/format_game_duration";
import { useFriendsQuery } from "~/hooks/use_friends";
import { useAiSpeedrunLeaderboardQuery, useLeaderboardQuery } from "~/hooks/use_leaderboard";
import { useUser } from "~/hooks/use_user";
import "./leaderboard_page.css";

type LeaderboardTab = "elo" | "ai-speedrun";

const rankShieldClass = (rank: number) => {
    if (rank === 1) return "leaderboard-rank--gold";
    if (rank === 2) return "leaderboard-rank--silver";
    if (rank === 3) return "leaderboard-rank--bronze";
    return null;
};

const LeaderboardRank = ({ rank }: { rank: number }) => {
    const shieldClass = rankShieldClass(rank);

    if (shieldClass) {
        return (
            <span className={clsx("leaderboard-rank", "leaderboard-rank--shield", shieldClass)}>
                <span className="leaderboard-rank__num">{rank}</span>
            </span>
        );
    }

    return <span className="leaderboard-rank">#{rank}</span>;
};

const LeaderboardPlayerCell = ({
    pseudo,
    userId,
    isFriend,
    isCurrentUser,
}: {
    pseudo: string | null;
    userId: number;
    isFriend: boolean;
    isCurrentUser: boolean;
}) => (
    <span className="leaderboard-player">
        <UserAvatar pseudo={pseudo} userId={userId} className="leaderboard-player__avatar" alt="" />
        <PlayerNameLink
            pseudo={pseudo}
            userId={userId}
            className={clsx(
                "leaderboard-player__name",
                isCurrentUser && "leaderboard-player__name--current",
            )}
        />
        {isFriend && <span className="leaderboard-friend-badge">Ami</span>}
        {isCurrentUser && <span className="leaderboard-player__you">(vous)</span>}
    </span>
);

const LeaderboardFriendCell = ({
    userId,
    isFriend,
    isCurrentUser,
}: {
    userId: number;
    isFriend: boolean;
    isCurrentUser: boolean;
}) => (
    <div className="leaderboard-friend-cell">
        {isCurrentUser ? (
            <span className="leaderboard-friend-dash">—</span>
        ) : (
            <FriendActionButton userId={userId} isFriend={isFriend} />
        )}
    </div>
);

const EloLeaderboardTable = ({
    entries,
    userId,
    friendIds,
}: {
    entries: ApiLeaderboardEntry[];
    userId: number | undefined;
    friendIds: Set<number>;
}) => (
    <div className="leaderboard-table-frame">
        <div className="leaderboard-table-scroll">
            <table className="leaderboard-table">
                <thead>
                    <tr>
                        <th>Rang</th>
                        <th>Joueur</th>
                        <th>Elo</th>
                        <th className="leaderboard-table__col--hide-sm">V / D</th>
                        <th className="leaderboard-table__col--right">Ami</th>
                    </tr>
                </thead>
                <tbody>
                    {entries.map((entry) => {
                        const isCurrentUser = userId === entry.userId;
                        const isFriend = friendIds.has(entry.userId);

                        return (
                            <tr
                                key={entry.userId}
                                className={clsx(isCurrentUser && "leaderboard-table__row--current")}
                            >
                                <td>
                                    <LeaderboardRank rank={entry.rank} />
                                </td>
                                <td>
                                    <LeaderboardPlayerCell
                                        pseudo={entry.pseudo}
                                        userId={entry.userId}
                                        isFriend={isFriend}
                                        isCurrentUser={isCurrentUser}
                                    />
                                </td>
                                <td>{entry.elo}</td>
                                <td className="leaderboard-table__col--hide-sm">
                                    {entry.wins} / {entry.losses}
                                </td>
                                <td className="leaderboard-table__col--right">
                                    <LeaderboardFriendCell
                                        userId={entry.userId}
                                        isFriend={isFriend}
                                        isCurrentUser={isCurrentUser}
                                    />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    </div>
);

const SpeedrunLeaderboardTable = ({
    entries,
    userId,
    friendIds,
}: {
    entries: ApiAiSpeedrunLeaderboardEntry[];
    userId: number | undefined;
    friendIds: Set<number>;
}) => (
    <div className="leaderboard-table-frame">
        <div className="leaderboard-table-scroll">
            <table className="leaderboard-table">
                <thead>
                    <tr>
                        <th>Rang</th>
                        <th>Joueur</th>
                        <th>Temps</th>
                        <th className="leaderboard-table__col--hide-sm">Tours</th>
                        <th className="leaderboard-table__col--right">Ami</th>
                    </tr>
                </thead>
                <tbody>
                    {entries.map((entry) => {
                        const isCurrentUser = userId === entry.userId;
                        const isFriend = friendIds.has(entry.userId);

                        return (
                            <tr
                                key={entry.userId}
                                className={clsx(isCurrentUser && "leaderboard-table__row--current")}
                            >
                                <td>
                                    <LeaderboardRank rank={entry.rank} />
                                </td>
                                <td>
                                    <LeaderboardPlayerCell
                                        pseudo={entry.pseudo}
                                        userId={entry.userId}
                                        isFriend={isFriend}
                                        isCurrentUser={isCurrentUser}
                                    />
                                </td>
                                <td>{formatSpeedrunDurationSeconds(entry.durationSeconds)}</td>
                                <td className="leaderboard-table__col--hide-sm">
                                    {entry.roundCount} tours
                                </td>
                                <td className="leaderboard-table__col--right">
                                    <LeaderboardFriendCell
                                        userId={entry.userId}
                                        isFriend={isFriend}
                                        isCurrentUser={isCurrentUser}
                                    />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    </div>
);

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
        <div className="leaderboard-page">
            <div className="leaderboard-page__bg" aria-hidden="true" />
            <div className="leaderboard-page__overlay" aria-hidden="true" />

            <div className="leaderboard-page__content">
                <div className="leaderboard-panel">
                    <div className="leaderboard-panel__corners" aria-hidden="true" />

                    <header className="leaderboard-panel__header">
                        <h1 className="leaderboard-panel__title">Classement</h1>
                        <p className="leaderboard-panel__subtitle">
                            {activeTab === "ai-speedrun"
                                ? "Jouez contre l'IA et gagnez la partie le plus rapidement possible !"
                                : "Affrontez les meilleurs et gravissez les rangs !"}
                        </p>
                    </header>

                    <div className="leaderboard-tabs" role="tablist">
                        <div className="leaderboard-tabs__wrap">
                            <div className="leaderboard-tabs__track">
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={activeTab === "elo"}
                                    className={clsx(
                                        "leaderboard-tabs__btn",
                                        "leaderboard-tabs__btn--left",
                                        activeTab === "elo"
                                            ? "leaderboard-tabs__btn--active"
                                            : "leaderboard-tabs__btn--inactive",
                                    )}
                                    onClick={() => setActiveTab("elo")}
                                >
                                    Elo
                                </button>
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={activeTab === "ai-speedrun"}
                                    className={clsx(
                                        "leaderboard-tabs__btn",
                                        "leaderboard-tabs__btn--right",
                                        activeTab === "ai-speedrun"
                                            ? "leaderboard-tabs__btn--active"
                                            : "leaderboard-tabs__btn--inactive",
                                    )}
                                    onClick={() => setActiveTab("ai-speedrun")}
                                >
                                    AI speedrun
                                </button>
                            </div>
                            <span className="leaderboard-tabs__gem" aria-hidden="true" />
                        </div>
                    </div>

                    <div className="leaderboard-panel__body">
                        {activeTab === "elo" ? (
                            eloEntries.length === 0 ? (
                                <p className="leaderboard-empty">
                                    Aucune partie classée pour le moment.
                                </p>
                            ) : (
                                <EloLeaderboardTable
                                    entries={eloEntries}
                                    userId={user?.id}
                                    friendIds={friendIds}
                                />
                            )
                        ) : speedrunEntries.length === 0 ? (
                            <p className="leaderboard-empty">
                                Aucune victoire contre l&apos;IA enregistrée pour le moment.
                            </p>
                        ) : (
                            <SpeedrunLeaderboardTable
                                entries={speedrunEntries}
                                userId={user?.id}
                                friendIds={friendIds}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});
