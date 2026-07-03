import type { ApiFriend } from "#api_types/friend.types";
import { Link } from "react-router-dom";
import {
    HOME_ASSETS,
    HOME_MOCK_FRIEND_AVATARS,
    HOME_MOCK_INVITATIONS,
    type HomeOnlineFriend,
} from "../home_mock_data";
import { HomePanel } from "./home_panel";

const toOnlineFriend = (friend: ApiFriend, index: number): HomeOnlineFriend => ({
    userId: friend.userId,
    pseudo: friend.pseudo ?? `Joueur #${friend.userId}`,
    status: friend.currentGameId !== null ? "in_game" : "online",
    avatarUrl: HOME_MOCK_FRIEND_AVATARS[index % HOME_MOCK_FRIEND_AVATARS.length],
});

const FriendRow = ({ friend }: { friend: HomeOnlineFriend }) => (
    <div className="home-friend">
        <div className="home-friend__avatar-wrap">
            <img src={friend.avatarUrl} alt="" className="home-friend__avatar" />
            <span
                className={`home-friend__status home-friend__status--${friend.status === "in_game" ? "in_game" : "online"}`}
            />
        </div>
        <span className="home-friend__name">{friend.pseudo}</span>
        <span
            className={`home-friend__status-label${friend.status === "in_game" ? " home-friend__status-label--in_game" : ""}`}
        >
            {friend.status === "in_game" ? "En jeu" : "En ligne"}
        </span>
    </div>
);

interface HomeRightSidebarProps {
    friends: ApiFriend[];
    isLoading: boolean;
}

export const HomeRightSidebar = ({ friends, isLoading }: HomeRightSidebarProps) => {
    const onlineFriends = friends.slice(0, 5).map(toOnlineFriend);

    return (
        <aside className="flex flex-col gap-3">
            <HomePanel title="Amis en Ligne">
                {isLoading ? (
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
                {HOME_MOCK_INVITATIONS.map((invite) => (
                    <div key={invite.id} className="home-invite">
                        <p className="home-invite__text">
                            <strong>{invite.fromPseudo}</strong> vous invite — {invite.mode}
                        </p>
                        <div className="home-invite__actions">
                            <button type="button" className="home-invite__btn home-invite__btn--accept" aria-label="Accepter">
                                ✓
                            </button>
                            <button type="button" className="home-invite__btn home-invite__btn--decline" aria-label="Refuser">
                                ✕
                            </button>
                        </div>
                    </div>
                ))}
            </HomePanel>
        </aside>
    );
};
