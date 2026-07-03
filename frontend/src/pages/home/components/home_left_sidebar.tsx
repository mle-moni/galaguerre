import { GoldCoinIcon } from "~/components/rewards/gold_coin_icon";
import { PackIcon } from "~/components/rewards/pack_icon";
import {
    HOME_MOCK_DAILY_QUESTS,
    HOME_MOCK_QUEST_RESET,
    type HomeQuest,
} from "../home_mock_data";
import { HomeCollectionPanel } from "./home_collection_panel";
import { HomeEventsPanel } from "./home_events_panel";
import { HomePanel } from "./home_panel";

const QuestRow = ({ quest }: { quest: HomeQuest }) => {
    const pct = Math.min(100, (quest.progress / quest.total) * 100);

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
                {quest.rewardType === "story_points" ? (
                    <GoldCoinIcon size={14} tooltip={false} />
                ) : (
                    <PackIcon width={14} />
                )}
                {quest.rewardAmount}
            </span>
        </div>
    );
};

export const HomeLeftSidebar = () => (
    <aside className="flex flex-col gap-3">
        <HomePanel
            title="Quêtes Quotidiennes"
            headerRight={<span className="home-panel__muted">{HOME_MOCK_QUEST_RESET}</span>}
        >
            {HOME_MOCK_DAILY_QUESTS.map((quest) => (
                <QuestRow key={quest.id} quest={quest} />
            ))}
        </HomePanel>

        <HomeCollectionPanel />

        <HomeEventsPanel />
    </aside>
);
