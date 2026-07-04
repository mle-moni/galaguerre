import type { ApiFriend, ApiFriendRequest } from "#api_types/friend.types";
import { Link } from "react-router-dom";
import { UserAvatar } from "~/components/user_avatar";
import {
    useAcceptFriendRequestMutation,
    useDeclineFriendRequestMutation,
} from "~/hooks/use_friend_requests";
import type { HomeOnlineFriend } from "../home_mock_data";
import { HomePanel } from "./home_panel";

const toOnlineFriend = (friend: ApiFriend): HomeOnlineFriend => ({
    userId: friend.userId,
    pseudo: friend.pseudo,
    status: friend.currentGameId !== null ? "in_game" : "online",
});

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
        <span className="home-friend__name">{friend.pseudo ?? `Joueur #${friend.userId}`}</span>
        <span
            className={`home-friend__status-label${friend.status === "in_game" ? " home-friend__status-label--in_game" : ""}`}
        >
            {friend.status === "in_game" ? "En jeu" : "En ligne"}
        </span>
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

interface HomeRightSidebarProps {
    friends: ApiFriend[];
    isLoadingFriends: boolean;
    friendRequests: ApiFriendRequest[];
    isLoadingRequests: boolean;
}

export const HomeRightSidebar = ({
    friends,
    isLoadingFriends,
    friendRequests,
    isLoadingRequests,
}: HomeRightSidebarProps) => {
    const onlineFriends = friends.slice(0, 5).map(toOnlineFriend);

    return (
        <aside className="flex flex-col gap-3">
            <HomePanel title="Amis en Ligne">
                {isLoadingFriends ? (
                    <p className="home-panel__muted">Chargement…</p>
                ) : onlineFriends.length === 0 ? (
                    <p className="home-panel__muted">Aucun ami pour le moment.</p>
                ) : (
                    onlineFriends.map((friend) => <FriendRow key={friend.userId} friend={friend} />)
                )}
                <Link to="/friends" className="home-sidebar__footer-link">
                    Voir tous les amis
                </Link>
            </HomePanel>

            <HomePanel title="Invitations">
                {isLoadingRequests ? (
                    <p className="home-panel__muted">Chargement…</p>
                ) : friendRequests.length === 0 ? (
                    <p className="home-panel__muted">Aucune invitation.</p>
                ) : (
                    friendRequests.map((request) => (
                        <FriendRequestRow key={request.id} request={request} />
                    ))
                )}
            </HomePanel>
        </aside>
    );
};
