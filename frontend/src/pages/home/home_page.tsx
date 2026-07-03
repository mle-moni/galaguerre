import { observer } from "mobx-react-lite";
import { useFriendsQuery } from "~/hooks/use_friends";
import { useUser } from "~/hooks/use_user";
import { HomeBottomSection } from "./components/home_bottom_section";
import { HomeHero } from "./components/home_hero";
import { HomeLeftSidebar } from "./components/home_left_sidebar";
import { HomeRightSidebar } from "./components/home_right_sidebar";
import "./home_page.css";

export const HomePage = observer(() => {
    const user = useUser()!;
    const friendsQuery = useFriendsQuery();
    const playTarget = user.currentGameId ? "/play" : "/matchmaking";

    return (
        <>
            <div className="home-grid">
                <HomeLeftSidebar elo={user.elo} />
                <HomeHero playTarget={playTarget} />
                <HomeRightSidebar
                    friends={friendsQuery.data ?? []}
                    isLoading={friendsQuery.isLoading}
                />
            </div>
            <HomeBottomSection />
        </>
    );
});
