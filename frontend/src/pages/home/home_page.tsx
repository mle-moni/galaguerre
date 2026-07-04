import { observer } from "mobx-react-lite";
import { useFriendRequestsQuery } from "~/hooks/use_friend_requests";
import { useFriendsQuery } from "~/hooks/use_friends";
import { useGameInvitesQuery } from "~/hooks/use_game_invites";
import { useUser } from "~/hooks/use_user";
import { HomeBottomSection } from "./components/home_bottom_section.jsx";
import { HomeHero } from "./components/home_hero.jsx";
import { HomeLeftSidebar } from "./components/home_left_sidebar.jsx";
import { HomeRightSidebar } from "./components/home_right_sidebar.jsx";
import "./home_page.css";

export const HomePage = observer(() => {
    const user = useUser()!;
    const friendsQuery = useFriendsQuery();
    const friendRequestsQuery = useFriendRequestsQuery();
    const gameInvitesQuery = useGameInvitesQuery();
    const playTarget = user.currentGameId ? "/play" : "/matchmaking";

    return (
        <>
            <div className="home-grid">
                <HomeLeftSidebar />
                <HomeHero playTarget={playTarget} />
                <HomeRightSidebar
                    friends={friendsQuery.data ?? []}
                    isLoadingFriends={friendsQuery.isLoading}
                    friendRequests={friendRequestsQuery.data ?? []}
                    isLoadingRequests={friendRequestsQuery.isLoading}
                    gameInvites={gameInvitesQuery.data ?? []}
                    isLoadingGameInvites={gameInvitesQuery.isLoading}
                />
            </div>
            <HomeBottomSection />
        </>
    );
});
