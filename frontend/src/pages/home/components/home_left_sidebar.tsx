import {
    HOME_ASSETS,
    HOME_MOCK_DAILY_QUESTS,
    HOME_MOCK_PROFILE,
    HOME_MOCK_QUEST_RESET,
    HOME_MOCK_SEASON,
    type HomeQuest,
} from "../home_mock_data";
import { HomeEventsPanel } from "./home_events_panel";
import { HomePanel } from "./home_panel";

const QuestRow = ({ quest }: { quest: HomeQuest }) => {
    const pct = Math.min(100, (quest.progress / quest.total) * 100);
    const rewardIcon =
        quest.rewardType === "gold" ? HOME_ASSETS.iconGold : HOME_ASSETS.iconCrystal;

    return (
        <div className="home-quest">
            <div className="home-quest__icon">⚔</div>
            <div className="home-quest__content">
                <p className="home-quest__title">
                    {quest.title} ({quest.progress}/{quest.total})
                </p>
                <div className="home-quest__bar-track">
                    <div className="home-quest__bar-fill" style={{ width: `${pct}%` }} />
                </div>
            </div>
            <span className="home-quest__reward">
                <img src={rewardIcon} alt="" />
                {quest.rewardAmount}
            </span>
        </div>
    );
};

interface HomeLeftSidebarProps {
    elo: number;
}

export const HomeLeftSidebar = ({ elo }: HomeLeftSidebarProps) => {
    const xpPct = (HOME_MOCK_PROFILE.xp / HOME_MOCK_PROFILE.xpMax) * 100;

    return (
        <aside className="flex flex-col gap-3">
            <HomePanel
                title="Quêtes Quotidiennes"
                headerRight={<span className="home-panel__muted">{HOME_MOCK_QUEST_RESET}</span>}
            >
                {HOME_MOCK_DAILY_QUESTS.map((quest) => (
                    <QuestRow key={quest.id} quest={quest} />
                ))}
            </HomePanel>

            <HomePanel title="Progression">
                <p className="home-progression__season">{HOME_MOCK_SEASON.name}</p>
                <p className="home-progression__timer">{HOME_MOCK_SEASON.timeRemaining} restants</p>
                <div className="home-progression__level-row">
                    <div className="home-progression__badge">{HOME_MOCK_PROFILE.level}</div>
                    <div className="home-progression__xp">
                        <p className="home-progression__xp-label">
                            {HOME_MOCK_PROFILE.xp.toLocaleString("fr-FR")} /{" "}
                            {HOME_MOCK_PROFILE.xpMax.toLocaleString("fr-FR")} XP · Elo {elo}
                        </p>
                        <div className="home-progression__bar-track">
                            <div
                                className="home-progression__bar-fill"
                                style={{ width: `${xpPct}%` }}
                            />
                        </div>
                    </div>
                </div>
            </HomePanel>

            <HomeEventsPanel />
        </aside>
    );
};
