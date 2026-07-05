import type {
    ApiGameHistoryPlayer,
    GameHistoryResult,
} from "#api_types/game_history.types";
import type { GameRatingPlayerResult } from "#api_types/game.types";
import { IconChevronLeft, IconCrown, IconFlame, IconSwords } from "@tabler/icons-react";
import clsx from "clsx";
import { observer } from "mobx-react-lite";
import { useMemo, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { FriendActionButton } from "~/components/friends/friend_action_button";
import { GameStatsTable } from "~/components/game_stats_table";
import { CenteredLoader } from "~/components/centered_loader";
import { PlayerNameLink } from "~/components/player_name_link";
import { UserAvatar } from "~/components/user_avatar";
import { formatGameDuration } from "~/helpers/format_game_duration";
import { useFriendsQuery } from "~/hooks/use_friends";
import { useGameHistoryDetailQuery } from "~/hooks/use_game_history";
import { useUser } from "~/hooks/use_user";
import "./game_history_detail_page.css";

const RESULT_LABELS: Record<GameHistoryResult, string> = {
    WIN: "Victoire",
    LOSS: "Défaite",
    DRAW: "Nul",
};

const formatDate = (isoDate: string) =>
    new Date(isoDate).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

const formatEloDelta = (delta: number) => (delta > 0 ? `+${delta}` : `${delta}`);

const getOpponentRating = (
    playerRating: GameRatingPlayerResult | null,
    ratingResult: { playerOne: GameRatingPlayerResult; playerTwo: GameRatingPlayerResult } | null,
): GameRatingPlayerResult | null => {
    if (!playerRating || !ratingResult) {
        return null;
    }

    const isPlayerOne =
        playerRating.eloBefore === ratingResult.playerOne.eloBefore &&
        playerRating.eloAfter === ratingResult.playerOne.eloAfter &&
        playerRating.delta === ratingResult.playerOne.delta;

    return isPlayerOne ? ratingResult.playerTwo : ratingResult.playerOne;
};

const GameHistoryResultBadge = ({ result }: { result: GameHistoryResult }) => {
    const badgeClass = clsx(
        "game-history-result-badge",
        result === "WIN" && "game-history-result-badge--win",
        result === "LOSS" && "game-history-result-badge--loss",
        result === "DRAW" && "game-history-result-badge--draw",
    );

    return (
        <span className={badgeClass}>
            {result === "WIN" && <IconCrown size={12} />}
            {result === "LOSS" && <IconFlame size={12} />}
            {RESULT_LABELS[result]}
            {result === "WIN" && <IconCrown size={12} />}
            {result === "LOSS" && <IconFlame size={12} />}
        </span>
    );
};

const GameHistoryPlayerCell = ({
    player,
    isWinner,
    isCurrentUser,
    isFriend,
    showFriendButton,
    side,
    rating,
}: {
    player: ApiGameHistoryPlayer;
    isWinner: boolean;
    isCurrentUser: boolean;
    isFriend: boolean;
    showFriendButton: boolean;
    side: "left" | "right";
    rating: GameRatingPlayerResult | null;
}) => (
    <div
        className={clsx(
            "game-history-detail-player",
            side === "left" && "game-history-detail-player--left",
            side === "right" && "game-history-detail-player--right",
            isWinner && "game-history-detail-player--winner",
        )}
    >
        <div className="game-history-detail-player__row">
            {isWinner && <IconCrown size={16} className="game-history-detail-player__crown" />}
            <UserAvatar
                pseudo={player.pseudo}
                userId={player.userId}
                className="game-history-detail-player__avatar"
                alt=""
            />
            <span className="inline-flex items-center gap-1 min-w-0">
                <PlayerNameLink
                    pseudo={player.pseudo}
                    userId={player.userId}
                    className={clsx(
                        "game-history-detail-player__name",
                        isCurrentUser && "game-history-detail-player__name--current",
                    )}
                />
                {showFriendButton && (
                    <FriendActionButton userId={player.userId} isFriend={isFriend} />
                )}
            </span>
        </div>
        {rating && (
            <span className="game-history-detail-player__elo">
                <span
                    className={clsx(
                        "game-history-detail-player__elo-delta",
                        rating.delta > 0 && "game-history-detail-player__elo-delta--positive",
                        rating.delta < 0 && "game-history-detail-player__elo-delta--negative",
                    )}
                >
                    {formatEloDelta(rating.delta)}
                </span>{" "}
                Elo ({rating.eloBefore} → {rating.eloAfter})
            </span>
        )}
    </div>
);

const GameHistoryDetailShell = ({
    children,
    backLink,
}: {
    children: ReactNode;
    backLink?: ReactNode;
}) => (
    <div className="game-history-detail-page">
        <div className="game-history-detail-page__bg" aria-hidden="true" />
        <div className="game-history-detail-page__overlay" aria-hidden="true" />
        <div className="game-history-detail-page__content">
            {backLink}
            <div className="game-history-detail-panel">
                <div className="game-history-detail-panel__corners" aria-hidden="true" />
                {children}
            </div>
        </div>
    </div>
);

export const GameHistoryDetailPage = observer(() => {
    const { userId: userIdParam, gameId: gameIdParam } = useParams();
    const userId = Number(userIdParam);
    const gameId = Number(gameIdParam);
    const currentUser = useUser();
    const detailQuery = useGameHistoryDetailQuery(userId, gameId);
    const friendsQuery = useFriendsQuery();

    const detail = detailQuery.data;
    const friendIds = useMemo(
        () => new Set((friendsQuery.data ?? []).map((friend) => friend.userId)),
        [friendsQuery.data],
    );

    const opponentRating = useMemo(
        () =>
            detail
                ? getOpponentRating(detail.playerRating, detail.ratingResult)
                : null,
        [detail],
    );

    if (!Number.isFinite(userId) || userId <= 0 || !Number.isFinite(gameId) || gameId <= 0) {
        return (
            <GameHistoryDetailShell>
                <p className="game-history-detail-panel__message">Partie invalide.</p>
            </GameHistoryDetailShell>
        );
    }

    if (detailQuery.isLoading) return <CenteredLoader absolute />;

    if (detailQuery.isError || !detailQuery.data || !detail) {
        return (
            <GameHistoryDetailShell>
                <p className="game-history-detail-panel__message">Partie introuvable.</p>
            </GameHistoryDetailShell>
        );
    }

    const isDraw = detail.result === "DRAW";
    const playerIsWinner = detail.winnerId === detail.player.userId;
    const opponentIsWinner = detail.winnerId === detail.opponent.userId;
    const playerIsCurrentUser = currentUser?.id === detail.player.userId;
    const opponentIsCurrentUser = currentUser?.id === detail.opponent.userId;
    const showEloUnchanged = isDraw || detail.ratingResult === null;

    return (
        <GameHistoryDetailShell
            backLink={
                <Link to={`/game-history/${userId}`} className="game-history-detail-back">
                    <IconChevronLeft size={16} />
                    Historique de {detail.user.pseudo ?? `Joueur #${userId}`}
                </Link>
            }
        >
            <div className="game-history-detail-panel__body">
                <div className="game-history-detail-summary">
                    <span className="game-history-detail-summary__date">
                        <IconSwords size={16} className="game-history-detail-summary__date-icon" />
                        {formatDate(detail.finishedAt)}
                    </span>
                    <GameHistoryResultBadge result={detail.result} />
                    {detail.playerRating && (
                        <span className="game-history-detail-summary__elo">
                            <span
                                className={clsx(
                                    "game-history-detail-summary__elo-delta",
                                    detail.playerRating.delta > 0 &&
                                        "game-history-detail-summary__elo-delta--positive",
                                    detail.playerRating.delta < 0 &&
                                        "game-history-detail-summary__elo-delta--negative",
                                )}
                            >
                                {formatEloDelta(detail.playerRating.delta)}
                            </span>
                            <span className="game-history-detail-summary__elo-detail">
                                Elo : {detail.playerRating.eloBefore} →{" "}
                                {detail.playerRating.eloAfter}
                            </span>
                        </span>
                    )}
                    <span className="game-history-detail-summary__meta">
                        {detail.roundCount} tours ·{" "}
                        {formatGameDuration(detail.createdAt, detail.finishedAt)}
                    </span>
                    {showEloUnchanged && (
                        <span className="game-history-detail-summary__elo-note">
                            {isDraw ? "Match nul — Elo inchangé" : "Elo inchangé"}
                        </span>
                    )}
                </div>

                <div className="game-history-detail-matchup">
                    <GameHistoryPlayerCell
                        player={detail.player}
                        isWinner={playerIsWinner}
                        isCurrentUser={playerIsCurrentUser}
                        isFriend={friendIds.has(detail.player.userId)}
                        showFriendButton={
                            !playerIsCurrentUser && currentUser !== null
                        }
                        side="left"
                        rating={detail.playerRating}
                    />
                    <span className="game-history-detail-matchup__vs">VS</span>
                    <GameHistoryPlayerCell
                        player={detail.opponent}
                        isWinner={opponentIsWinner}
                        isCurrentUser={opponentIsCurrentUser}
                        isFriend={friendIds.has(detail.opponent.userId)}
                        showFriendButton={
                            !opponentIsCurrentUser && currentUser !== null
                        }
                        side="right"
                        rating={opponentRating}
                    />
                </div>

                <GameStatsTable
                    playerA={detail.player}
                    playerB={detail.opponent}
                    winnerUserId={detail.winnerId}
                    highlightUserId={currentUser?.id}
                    linkToHistory
                    onParchmentBackground
                />

                {detail.hasReplay && (
                    <Link
                        to={`/game-history/${userId}/${gameId}/replay`}
                        className="game-history-detail-replay"
                    >
                        Voir le replay
                        <span className="game-history-detail-replay__chevron" aria-hidden="true">
                            ›
                        </span>
                    </Link>
                )}
            </div>
        </GameHistoryDetailShell>
    );
});
