import type { ApiGameHistoryEntry } from "#api_types/game_history.types";
import { IconSwords } from "@tabler/icons-react";
import clsx from "clsx";
import { observer } from "mobx-react-lite";
import { useMemo, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FriendActionButton } from "~/components/friends/friend_action_button";
import { CenteredLoader } from "~/components/centered_loader";
import { GameHistoryResultBadge } from "~/components/game_history_result_badge";
import { formatPlayerName, PlayerNameLink } from "~/components/player_name_link";
import { UserAvatar } from "~/components/user_avatar";
import { useAvatarImageUrl } from "~/hooks/use_avatar_image_url";
import { useFriendsQuery } from "~/hooks/use_friends";
import { useGameHistoryListQuery } from "~/hooks/use_game_history";
import { useUser } from "~/hooks/use_user";
import "./game_history_list_page.css";

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

const GameHistoryRow = ({
    entry,
    friendIds,
    onSelect,
}: {
    entry: ApiGameHistoryEntry;
    friendIds: Set<number>;
    onSelect: (gameId: number) => void;
}) => {
    const isFriend = friendIds.has(entry.opponentUserId);
    const avatarImageUrl = useAvatarImageUrl(entry.opponentAvatarCardId);
    const eloClass =
        entry.eloDelta === null
            ? "game-history-list-elo--neutral"
            : entry.eloDelta > 0
              ? "game-history-list-elo--positive"
              : entry.eloDelta < 0
                ? "game-history-list-elo--negative"
                : "game-history-list-elo--neutral";

    return (
        <tr onClick={() => onSelect(entry.gameId)}>
            <td>
                <span className="game-history-list-date">
                    <IconSwords size={16} className="game-history-list-date__icon" />
                    {formatDate(entry.finishedAt)}
                </span>
            </td>
            <td>
                <span className="game-history-list-opponent">
                    <UserAvatar
                        pseudo={entry.opponentPseudo}
                        userId={entry.opponentUserId}
                        imageUrl={avatarImageUrl}
                        className="game-history-list-opponent__avatar"
                        alt=""
                    />
                    <PlayerNameLink
                        pseudo={entry.opponentPseudo}
                        userId={entry.opponentUserId}
                        className="game-history-list-opponent__name"
                        stopPropagation
                    />
                    {isFriend && <span className="game-history-list-friend-badge">Ami</span>}
                </span>
            </td>
            <td>
                <GameHistoryResultBadge result={entry.result} isFriendly={entry.isFriendly} />
            </td>
            <td>
                <span className={clsx("game-history-list-elo", eloClass)}>
                    {formatEloDelta(entry.eloDelta)}
                </span>
            </td>
            <td className="game-history-list-table__col--hide-sm">{entry.roundCount}</td>
            <td className="game-history-list-table__col--right">
                <button
                    type="button"
                    className="game-history-list-row-action"
                    aria-label={`Voir la partie contre ${formatPlayerName(entry.opponentPseudo, entry.opponentUserId)}`}
                    onClick={(event) => {
                        event.stopPropagation();
                        onSelect(entry.gameId);
                    }}
                >
                    ›
                </button>
            </td>
        </tr>
    );
};

const GameHistoryListShell = ({ children }: { children: ReactNode }) => (
    <div className="game-history-list-page">
        <div className="game-history-list-page__bg" aria-hidden="true" />
        <div className="game-history-list-page__overlay" aria-hidden="true" />
        <div className="game-history-list-page__content">
            <div className="game-history-list-panel">
                <div className="game-history-list-panel__corners" aria-hidden="true" />
                {children}
            </div>
        </div>
    </div>
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
            <GameHistoryListShell>
                <p className="game-history-list-panel__message">Joueur invalide.</p>
            </GameHistoryListShell>
        );
    }

    if (historyQuery.isLoading) return <CenteredLoader absolute />;

    if (historyQuery.isError || !historyQuery.data) {
        return (
            <GameHistoryListShell>
                <p className="game-history-list-panel__message">Joueur introuvable.</p>
            </GameHistoryListShell>
        );
    }

    const { user, games } = historyQuery.data;
    const isOwnHistory = currentUser?.id === user.userId;
    const playerName = formatPlayerName(user.pseudo, user.userId);

    return (
        <GameHistoryListShell>
            <header className="game-history-list-panel__header">
                <h1 className="game-history-list-panel__title">
                    {playerName} : historique des parties
                    {isOwnHistory && (
                        <span className="game-history-list-panel__title-you"> (vous)</span>
                    )}
                </h1>
                <p className="game-history-list-panel__subtitle">
                    Elo {user.elo} — {user.wins}V / {user.losses}D
                </p>
                {!isOwnHistory && (
                    <div className="game-history-list-panel__header-actions">
                        <FriendActionButton
                            userId={user.userId}
                            isFriend={friendIds.has(user.userId)}
                            size="md"
                        />
                    </div>
                )}
            </header>

            <div className="game-history-list-panel__body">
                {games.length === 0 ? (
                    <p className="game-history-list-empty">
                        Aucune partie terminée pour le moment.
                    </p>
                ) : (
                    <div className="game-history-list-table-frame">
                        <div className="game-history-list-table-scroll">
                            <table className="game-history-list-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Adversaire</th>
                                        <th>Résultat</th>
                                        <th>Elo</th>
                                        <th className="game-history-list-table__col--hide-sm">
                                            Tours
                                        </th>
                                        <th aria-hidden="true" />
                                    </tr>
                                </thead>
                                <tbody>
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
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {currentUser && !isOwnHistory && (
                    <div className="game-history-list-footer">
                        <Link
                            to={`/game-history/${currentUser.id}`}
                            className="game-history-list-footer__link"
                        >
                            Voir mon historique
                        </Link>
                    </div>
                )}
            </div>
        </GameHistoryListShell>
    );
});
