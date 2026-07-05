import type { ApiDailyQuest } from "#api_types/daily_quests.types";
import { Button, Loader, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import { DailyQuestTitle } from "~/components/daily_quests/daily_quest_title";
import { GoldCoinIcon } from "~/components/rewards/gold_coin_icon";
import { PackIcon } from "~/components/rewards/pack_icon";
import { formatDurationSeconds } from "~/helpers/format_game_duration";
import {
    isQuestClaimable,
    isQuestClaimed,
    useClaimDailyQuestMutation,
    useDailyQuestsQuery,
} from "~/hooks/use_daily_quests";
import { notifySuccess } from "~/services/toasts";
import { HomeCollectionPanel } from "./home_collection_panel.jsx";
import { HomeEventsPanel } from "./home_events_panel.jsx";
import { HomePanel } from "./home_panel.jsx";

const QuestReward = ({ quest }: { quest: ApiDailyQuest }) => (
    <span className="home-quest__reward">
        {quest.rewardType === "story_points" ? (
            <GoldCoinIcon size={14} tooltip={false} />
        ) : (
            <PackIcon width={14} />
        )}
        {quest.rewardAmount}
    </span>
);

const QuestRow = ({ quest }: { quest: ApiDailyQuest }) => {
    const claimMutation = useClaimDailyQuestMutation();
    const pct = Math.min(100, (quest.progress / quest.target) * 100);
    const claimable = isQuestClaimable(quest);
    const claimed = isQuestClaimed(quest);

    const handleClaim = async () => {
        await claimMutation.mutateAsync(quest.id);
        notifySuccess("Récompense réclamée !");
    };

    return (
        <div className={`home-quest${claimed ? " home-quest--claimed" : ""}`}>
            <div className="home-quest__icon">{claimed ? "✔️" : "📜"}</div>
            <div className="home-quest__content">
                <p className="home-quest__title">
                    <span className="home-quest__title-text">
                        <DailyQuestTitle quest={quest} />
                    </span>{" "}
                    ({quest.progress}/{quest.target})
                </p>
                <div className="home-quest__bar-track">
                    <div className="home-quest__bar-fill" style={{ width: `${pct}%` }} />
                </div>
            </div>
            {claimable ? (
                <Button
                    size="compact-xs"
                    variant="light"
                    color="yellow"
                    loading={claimMutation.isPending}
                    onClick={() => void handleClaim()}
                >
                    Réclamer
                </Button>
            ) : (
                <QuestReward quest={quest} />
            )}
        </div>
    );
};

const QuestResetTimer = ({ resetInSeconds }: { resetInSeconds: number }) => {
    const [secondsLeft, setSecondsLeft] = useState(resetInSeconds);

    useEffect(() => {
        setSecondsLeft(resetInSeconds);
    }, [resetInSeconds]);

    useEffect(() => {
        const interval = window.setInterval(() => {
            setSecondsLeft((current) => Math.max(0, current - 1));
        }, 1000);

        return () => window.clearInterval(interval);
    }, []);

    return <span className="home-panel__muted">{formatDurationSeconds(secondsLeft)}</span>;
};

export const HomeLeftSidebar = () => {
    const { data, isLoading, isError } = useDailyQuestsQuery();

    return (
        <aside className="flex flex-col gap-3">
            <HomePanel
                title="Quêtes Quotidiennes"
                headerRight={data ? <QuestResetTimer resetInSeconds={data.resetInSeconds} /> : null}
            >
                {isLoading ? (
                    <div className="home-quest__loading">
                        <Loader size="sm" />
                    </div>
                ) : null}
                {isError ? (
                    <Text size="xs" c="dimmed">
                        Impossible de charger les quêtes.
                    </Text>
                ) : null}
                {data?.quests.map((quest) => (
                    <QuestRow key={quest.id} quest={quest} />
                ))}
            </HomePanel>

            <HomeCollectionPanel />

            <HomeEventsPanel />
        </aside>
    );
};
