import type { ApiUser } from "#api_types/auth.types";
import { observer } from "mobx-react-lite";
import { TargetingArrowOverlay } from "~/components/targeting/targeting_arrow_overlay";
import { useArmedCardInteraction } from "~/hooks/use_armed_card_interaction";
import { useTargetingArrow } from "~/hooks/use_targeting_arrow";
import { useTargetSelectionCancel } from "~/hooks/use_target_selection_cancel";
import { useGameContext } from "~/hooks/use_game_state";
import { GameAnimationOverlay } from "../../animations/game_animation_overlay.jsx";
import { Board } from "../../board/board.jsx";
import { AbandonGameControl } from "../abandon_game/abandon_game_control.jsx";
import { ActionTimelineFab } from "../action_timeline/action_timeline_fab.jsx";
import { ArmedCardHint } from "../armed_card_hint/armed_card_hint.jsx";
import { GameFinalScreen } from "../game_final_screen/game_final_screen.jsx";
import { MulliganOverlay } from "../mulligan/mulligan_overlay.jsx";
import { OnboardingCoach } from "../onboarding_coach/onboarding_coach.jsx";
import { PlayedCardReveal } from "../played_card_reveal/played_card_reveal.jsx";
import { PlayerHand } from "../player_hand/player_hand.jsx";
import { MobileOpponentBar } from "./mobile_opponent_bar.jsx";
import { MobilePlayerBar } from "./mobile_player_bar.jsx";
import "./mobile.css";

interface MobileGameLayoutProps {
    user: ApiUser;
    spectating?: boolean;
}

export const MobileGameLayout = observer<MobileGameLayoutProps>(
    ({ user: _user, spectating = false }) => {
        const { store } = useGameContext();
        useTargetSelectionCancel(store);
        useArmedCardInteraction(store);
        useTargetingArrow(store);

        const me = store.me;
        const opponent = store.opponent;

        return (
            <div className="mobile-game-layout">
                {!spectating && <AbandonGameControl />}
                <ActionTimelineFab />
                <MobileOpponentBar opponent={opponent} />
                <div className="mobile-game-layout__board">
                    <PlayedCardReveal />
                    <Board />
                </div>
                <MobilePlayerBar me={me} />
                <div className="mobile-game-layout__hand-area">
                    <PlayerHand player={me} isMobile />
                </div>

                <GameFinalScreen />
                {!spectating && <MulliganOverlay />}
                {!spectating && <OnboardingCoach />}
                {!spectating && <ArmedCardHint isMobile />}
                {!spectating && <TargetingArrowOverlay />}
                <GameAnimationOverlay />
            </div>
        );
    },
);
