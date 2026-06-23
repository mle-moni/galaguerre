import { Button, Text } from "@mantine/core";
import { observer } from "mobx-react-lite";
import { useState } from "react";
import { useGameContext } from "~/hooks/use_game_state";
import { useOnboardingGame } from "~/hooks/use_onboarding_game";
import {
    getActiveOnboardingCoachStep,
    type OnboardingCoachStepId,
} from "./get_onboarding_coach_step.js";
import "./onboarding_coach.css";

export const OnboardingCoach = observer(() => {
    const isOnboardingGame = useOnboardingGame();
    const { store } = useGameContext();
    const [dismissedStepIds, setDismissedStepIds] = useState<Set<OnboardingCoachStepId>>(
        () => new Set(),
    );
    const [isHidden, setIsHidden] = useState(false);

    if (!isOnboardingGame || isHidden || store.isMulligan || store.isFinished) {
        return null;
    }

    const activeStep = getActiveOnboardingCoachStep(store, dismissedStepIds);
    if (!activeStep) return null;

    const dismissStep = () => {
        setDismissedStepIds((current) => new Set([...current, activeStep.id]));
    };

    return (
        <aside className="onboarding-coach" aria-live="polite">
            <Text className="onboarding-coach__message">{activeStep.message}</Text>
            <div className="onboarding-coach__actions">
                <Button variant="subtle" color="gray" size="xs" onClick={() => setIsHidden(true)}>
                    Masquer les astuces
                </Button>
                <Button size="xs" className="gg-btn-primary" onClick={dismissStep}>
                    Compris
                </Button>
            </div>
        </aside>
    );
});
