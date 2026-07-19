import type { ApiUser } from "#api_types/auth.types";
import type { ApiGame } from "#api_types/game.types";
import { observer } from "mobx-react-lite";
import { TargetingArrowOverlay } from "~/components/targeting/targeting_arrow_overlay";
import { useGameContext } from "~/hooks/use_game_state";
import { useArmedCardInteraction } from "~/hooks/use_armed_card_interaction";
import { useIsMobilePortrait } from "~/hooks/use_is_mobile_portrait";
import { useTargetingArrow } from "~/hooks/use_targeting_arrow";
import { useTargetSelectionCancel } from "~/hooks/use_target_selection_cancel";

import { GameAnimationOverlay } from "./animations/game_animation_overlay.jsx";
import { ArmedCardHint } from "./hud/armed_card_hint/armed_card_hint.jsx";
import { ActionTimeline } from "./hud/action_timeline/action_timeline.jsx";
import { MobileGameLayout } from "./hud/mobile/mobile_game_layout.jsx";
import { Board } from "./board/board.jsx";
import { DecksInfos } from "./hud/decks_infos/decks_infos.jsx";
import { GameFinalScreen } from "./hud/game_final_screen/game_final_screen.jsx";
import { GameHudControls } from "./hud/game_hud_controls/game_hud_controls.jsx";
import { GameMusicController } from "./game_music_controller.jsx";
import { MulliganOverlay } from "./hud/mulligan/mulligan_overlay.jsx";
import { DiscoverOverlay } from "./hud/discover/discover_overlay.jsx";
import { DiscoverOpponentIndicator } from "./hud/discover/discover_opponent_indicator.jsx";
import { OnboardingCoach } from "./hud/onboarding_coach/onboarding_coach.jsx";
import { PlayedCardReveal } from "./hud/played_card_reveal/played_card_reveal.jsx";
import { PlayerHand } from "./hud/player_hand/player_hand.jsx";
import { PlayersInfos } from "./hud/players_infos/players_infos.jsx";
import "./game_layout.css";
import "./play_desktop_theme.css";

interface GameRendererProps {
    game: ApiGame;
    user: ApiUser;
    spectating?: boolean;
}

const DesktopGameLayout = observer<GameRendererProps>(({ spectating = false }) => {
    const { store } = useGameContext();
    useTargetSelectionCancel(store);
    useArmedCardInteraction(store);
    useTargetingArrow(store);

    const me = store.me;
    const opponent = store.opponent;

    return (
        <div className="play-desktop-layout h-full relative">
            <ActionTimeline />
            {!spectating && <GameHudControls />}
            <div className="flex h-full">
                <div className="play-desktop-layout__sidebar flex justify-center">
                    <PlayersInfos me={me} opponent={opponent} />
                </div>
                <div className="play-desktop-layout__board-column">
                    <PlayedCardReveal />
                    <div
                        className="desktop-hand-reserve desktop-hand-reserve--top"
                        aria-hidden="true"
                    />
                    <div className="flex-1 min-h-0 relative">
                        <DiscoverOpponentIndicator />
                        <Board />
                    </div>
                    <div
                        className="desktop-hand-reserve desktop-hand-reserve--bottom"
                        aria-hidden="true"
                    />
                </div>
                <div className="play-desktop-layout__sidebar flex justify-center">
                    <DecksInfos me={me} opponent={opponent} />
                </div>
            </div>
            <PlayerHand player={opponent} isOpponent />
            <PlayerHand player={me} />

            <GameFinalScreen />
            {!spectating && <MulliganOverlay />}
            {!spectating && <DiscoverOverlay />}
            {!spectating && <OnboardingCoach />}
            {!spectating && <ArmedCardHint />}
            {!spectating && <TargetingArrowOverlay />}
            <GameAnimationOverlay />
        </div>
    );
});

export const GameRenderer = observer<GameRendererProps>(({ game, user, spectating = false }) => {
    const isMobilePortrait = useIsMobilePortrait();

    return (
        <>
            <GameMusicController />
            {isMobilePortrait ? (
                <MobileGameLayout user={user} spectating={spectating} />
            ) : (
                <DesktopGameLayout game={game} user={user} spectating={spectating} />
            )}
        </>
    );
});
