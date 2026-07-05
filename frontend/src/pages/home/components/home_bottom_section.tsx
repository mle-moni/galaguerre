import {
    getDefaultProgressionViewStart,
    getLevelTitle,
    getProgressionVisibleLevels,
    isProgressionLevelClaimable,
} from "#api_types/progression";
import { ActionIcon, Button, Tooltip } from "@mantine/core";
import { IconCheck, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { PackIcon } from "~/components/rewards/pack_icon";
import { useClaimProgressionLevelMutation } from "~/hooks/use_progression_rewards";
import { useUser } from "~/hooks/use_user";
import { notifySuccess } from "~/services/toasts";
import { HomeNewsPanel } from "./home_news_panel.jsx";
import { HomePanel } from "./home_panel.jsx";

const ProgressionMilestone = ({
    level,
    currentLevel,
    claimed,
}: {
    level: number;
    currentLevel: number;
    claimed: boolean;
}) => {
    const claimMutation = useClaimProgressionLevelMutation();
    const claimable = isProgressionLevelClaimable(level, currentLevel) && !claimed;
    const state =
        level < currentLevel ? "reached" : level === currentLevel ? "current" : "upcoming";

    const handleClaim = async () => {
        await claimMutation.mutateAsync(level);
        notifySuccess("Récompense réclamée !");
    };

    return (
        <Tooltip label={`${getLevelTitle(level)} · Niveau ${level}`} withArrow>
            <div
                className={[
                    "home-progression-panel__milestone",
                    `home-progression-panel__milestone--${state}`,
                    claimable ? "home-progression-panel__milestone--claimable" : "",
                    claimed && level < currentLevel
                        ? "home-progression-panel__milestone--claimed"
                        : "",
                ]
                    .filter(Boolean)
                    .join(" ")}
            >
                <div className="home-progression-panel__milestone-icon">
                    {claimed && level < currentLevel ? <IconCheck size={16} /> : level}
                </div>
                {claimable ? (
                    <>
                        <PackIcon width={14} />
                        <Button
                            size="compact-xs"
                            variant="light"
                            color="yellow"
                            loading={claimMutation.isPending}
                            onClick={() => void handleClaim()}
                            className="home-progression-panel__claim-btn"
                        >
                            Réclamer
                        </Button>
                    </>
                ) : (
                    <span className="home-progression-panel__milestone-level">Niv. {level}</span>
                )}
            </div>
        </Tooltip>
    );
};

export const HomeBottomSection = () => {
    const user = useUser();
    const progression = user?.progression;
    const claimedProgressionLevels = user?.claimedProgressionLevels ?? [];
    const claimedLevels = new Set(claimedProgressionLevels);
    const [viewStart, setViewStart] = useState(1);

    useEffect(() => {
        if (!progression) return;
        setViewStart(getDefaultProgressionViewStart(progression.level, claimedProgressionLevels));
    }, [progression?.level, claimedProgressionLevels]);

    if (!progression) {
        return (
            <section className="home-bottom">
                <HomeNewsPanel />
                <HomePanel title="Progression" className="home-progression-panel">
                    <p className="home-panel__muted">Chargement…</p>
                </HomePanel>
            </section>
        );
    }

    const xpPct =
        progression.xpToNextLevel === null
            ? 100
            : (progression.xpInLevel / progression.xpToNextLevel) * 100;
    const visibleLevels = getProgressionVisibleLevels(viewStart);
    const maxViewStart = progression.level;
    const canScrollLeft = viewStart > 1;
    const canScrollRight = viewStart < maxViewStart;

    return (
        <section className="home-bottom">
            <HomeNewsPanel />

            <HomePanel title="Progression" className="home-progression-panel">
                <div className="home-progression-panel__top">
                    <div className="home-progression__badge">{progression.level}</div>
                    <div className="home-progression__xp" style={{ flex: 1 }}>
                        <p className="home-progression__level-title">{progression.levelTitle}</p>
                        <p className="home-progression__xp-label">
                            {progression.xpToNextLevel === null
                                ? `${progression.xp.toLocaleString("fr-FR")} XP — Niveau max`
                                : `${progression.xpInLevel.toLocaleString("fr-FR")} / ${progression.xpToNextLevel.toLocaleString("fr-FR")} XP`}
                        </p>
                        <div className="home-progression__bar-track">
                            <div
                                className="home-progression__bar-fill"
                                style={{ width: `${xpPct}%` }}
                            />
                        </div>
                    </div>
                </div>
                <div className="home-progression-panel__track-wrap">
                    {canScrollLeft ? (
                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="sm"
                            aria-label="Voir les niveaux précédents"
                            className="home-progression-panel__nav-btn"
                            onClick={() => setViewStart((current) => Math.max(1, current - 1))}
                        >
                            <IconChevronLeft size={16} />
                        </ActionIcon>
                    ) : (
                        <span className="home-progression-panel__nav-spacer" />
                    )}
                    <div className="home-progression-panel__track">
                        {visibleLevels.map((level) => (
                            <ProgressionMilestone
                                key={level}
                                level={level}
                                currentLevel={progression.level}
                                claimed={claimedLevels.has(level)}
                            />
                        ))}
                    </div>
                    {canScrollRight ? (
                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="sm"
                            aria-label="Revenir aux niveaux récents"
                            className="home-progression-panel__nav-btn"
                            onClick={() =>
                                setViewStart((current) => Math.min(maxViewStart, current + 1))
                            }
                        >
                            <IconChevronRight size={16} />
                        </ActionIcon>
                    ) : (
                        <span className="home-progression-panel__nav-spacer" />
                    )}
                </div>
            </HomePanel>
        </section>
    );
};
