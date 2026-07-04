import type { ApiFriend, ApiFriendRequest } from "#api_types/friend.types";
import type { ApiGameInvite } from "#api_types/game_invite.types";
import { Link } from "react-router-dom";
import { UserAvatar } from "~/components/user_avatar";
import { GameInviteButton } from "~/components/friends/game_invite_button";
import {
    useAcceptFriendRequestMutation,
    useDeclineFriendRequestMutation,
} from "~/hooks/use_friend_requests";
import {
    useAcceptGameInviteMutation,
    useDeclineGameInviteMutation,
} from "~/hooks/use_game_invites";
import type { HomeOnlineFriend } from "../home_mock_data.js";
import { HomePanel } from "./home_panel.jsx";

const toOnlineFriend = (friend: ApiFriend): HomeOnlineFriend => ({
    userId: friend.userId,
    pseudo: friend.pseudo,
    status: friend.currentGameId !== null ? "in_game" : "online",
    level: friend.level,
    levelTitle: friend.levelTitle,
});

const compareOnlineFriends = (left: ApiFriend, right: ApiFriend) => {
    const leftInGame = left.currentGameId !== null ? 0 : 1;
    const rightInGame = right.currentGameId !== null ? 0 : 1;
    return leftInGame - rightInGame;
};

const FriendRow = ({ friend }: { friend: HomeOnlineFriend }) => (
    <div className="home-friend">
        <div className="home-friend__avatar-wrap">
            <UserAvatar
                pseudo={friend.pseudo}
                userId={friend.userId}
                className="home-friend__avatar"
            />
            <span
                className={`home-friend__status home-friend__status--${friend.status === "in_game" ? "in_game" : "online"}`}
            />
        </div>
        <div className="home-friend__info">
            <span className="home-friend__name">{friend.pseudo ?? `Joueur #${friend.userId}`}</span>
            <span className="home-friend__level">
                Niv. {friend.level} · {friend.levelTitle}
            </span>
        </div>
        <span
            className={`home-friend__status-label${friend.status === "in_game" ? " home-friend__status-label--in_game" : ""}`}
        >
            {friend.status === "in_game" ? "En jeu" : "En ligne"}
        </span>
        {friend.status === "online" && (
            <GameInviteButton
                friend={{
                    userId: friend.userId,
                    isOnline: true,
                    currentGameId: null,
                }}
            />
        )}
    </div>
);

const FriendRequestRow = ({ request }: { request: ApiFriendRequest }) => {
    const acceptMutation = useAcceptFriendRequestMutation();
    const declineMutation = useDeclineFriendRequestMutation();
    const isLoading =
        (acceptMutation.isPending && acceptMutation.variables === request.id) ||
        (declineMutation.isPending && declineMutation.variables === request.id);

    return (
        <div className="home-invite">
            <p className="home-invite__text">
                <strong>{request.fromPseudo ?? `Joueur #${request.fromUserId}`}</strong> vous invite
                — Demande d'ami
            </p>
            <div className="home-invite__actions">
                <button
                    type="button"
                    className="home-invite__btn home-invite__btn--accept"
                    aria-label="Accepter"
                    disabled={isLoading}
                    onClick={() => acceptMutation.mutate(request.id)}
                >
                    ✓
                </button>
                <button
                    type="button"
                    className="home-invite__btn home-invite__btn--decline"
                    aria-label="Refuser"
                    disabled={isLoading}
                    onClick={() => declineMutation.mutate(request.id)}
                >
                    ✕
                </button>
            </div>
        </div>
    );
};

const GameInviteRow = ({ invite }: { invite: ApiGameInvite }) => {
    const acceptMutation = useAcceptGameInviteMutation();
    const declineMutation = useDeclineGameInviteMutation();
    const isLoading =
        (acceptMutation.isPending && acceptMutation.variables === invite.id) ||
        (declineMutation.isPending && declineMutation.variables === invite.id);

    return (
        <div className="home-invite">
            <p className="home-invite__text">
                <strong>{invite.fromPseudo ?? `Joueur #${invite.fromUserId}`}</strong> vous invite —
                Partie classée
            </p>
            <div className="home-invite__actions">
                <button
                    type="button"
                    className="home-invite__btn home-invite__btn--accept"
                    aria-label="Accepter"
                    disabled={isLoading}
                    onClick={() => acceptMutation.mutate(invite.id)}
                >
                    ✓
                </button>
                <button
                    type="button"
                    className="home-invite__btn home-invite__btn--decline"
                    aria-label="Refuser"
                    disabled={isLoading}
                    onClick={() => declineMutation.mutate(invite.id)}
                >
                    ✕
                </button>
            </div>
        </div>
    );
};

interface HomeRightSidebarProps {
    friends: ApiFriend[];
    isLoadingFriends: boolean;
    friendRequests: ApiFriendRequest[];
    isLoadingRequests: boolean;
    gameInvites: ApiGameInvite[];
    isLoadingGameInvites: boolean;
}

export const HomeRightSidebar = ({
    friends,
    isLoadingFriends,
    friendRequests,
    isLoadingRequests,
    gameInvites,
    isLoadingGameInvites,
}: HomeRightSidebarProps) => {
    const onlineFriends = friends
        .filter((friend) => friend.isOnline)
        .sort(compareOnlineFriends)
        .slice(0, 5)
        .map(toOnlineFriend);

    return (
        <aside className="flex flex-col gap-3">
            <HomePanel title="Amis en Ligne">
                {isLoadingFriends ? (
                    <p className="home-panel__muted">Chargement…</p>
                ) : onlineFriends.length === 0 ? (
                    <p className="home-panel__muted">Aucun ami en ligne.</p>
                ) : (
                    onlineFriends.map((friend) => <FriendRow key={friend.userId} friend={friend} />)
                )}
                <Link to="/friends" className="home-sidebar__footer-link">
                    Voir tous les amis
                </Link>
            </HomePanel>

            <HomePanel title="Invitations">
                {isLoadingRequests || isLoadingGameInvites ? (
                    <p className="home-panel__muted">Chargement…</p>
                ) : friendRequests.length === 0 && gameInvites.length === 0 ? (
                    <p className="home-panel__muted">Aucune invitation.</p>
                ) : (
                    <>
                        {gameInvites.map((invite) => (
                            <GameInviteRow key={`game-${invite.id}`} invite={invite} />
                        ))}
                        {friendRequests.map((request) => (
                            <FriendRequestRow key={`friend-${request.id}`} request={request} />
                        ))}
                    </>
                )}
            </HomePanel>
        </aside>
    );
};
