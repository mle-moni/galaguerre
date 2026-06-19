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
import { useGameAnimations } from "./animations/use_game_animations.js";
import { AbandonGameControl } from "./hud/abandon_game/abandon_game_control.jsx";
import { ArmedCardHint } from "./hud/armed_card_hint/armed_card_hint.jsx";
import { ActionTimeline } from "./hud/action_timeline/action_timeline.jsx";
import { MobileGameLayout } from "./hud/mobile/mobile_game_layout.jsx";
import { Board } from "./board/board.jsx";
import { DecksInfos } from "./hud/decks_infos/decks_infos.jsx";
import { GameFinalScreen } from "./hud/game_final_screen/game_final_screen.jsx";
import { MulliganOverlay } from "./hud/mulligan/mulligan_overlay.jsx";
import { PlayerHand } from "./hud/player_hand/player_hand.jsx";
import { PlayersInfos } from "./hud/players_infos/players_infos.jsx";
import "./game_layout.css";

interface GameRendererProps {
    game: ApiGame;
    user: ApiUser;
}

const DesktopGameLayout = observer<GameRendererProps>(({ game, user }) => {
    const { store } = useGameContext();
    useTargetSelectionCancel(store);
    useArmedCardInteraction(store);
    useTargetingArrow(store);
    useGameAnimations(game, user.id);

    const me = game.data.playerOne.userId === user.id ? game.data.playerOne : game.data.playerTwo;
    const opponent =
        game.data.playerOne.userId === user.id ? game.data.playerTwo : game.data.playerOne;

    return (
        <div className="h-full relative">
            <AbandonGameControl />
            <ActionTimeline />
            <div className="flex h-full">
                <div className="flex justify-center w-[124px]">
                    <PlayersInfos me={me} opponent={opponent} />
                </div>
                <div className="bg-blue-400 flex-1 flex flex-col min-h-0">
                    <div
                        className="desktop-hand-reserve desktop-hand-reserve--top"
                        aria-hidden="true"
                    />
                    <div className="flex-1 min-h-0">
                        <Board />
                    </div>
                    <div
                        className="desktop-hand-reserve desktop-hand-reserve--bottom"
                        aria-hidden="true"
                    />
                </div>
                <div className="flex justify-center w-[124px]">
                    <DecksInfos me={me} opponent={opponent} />
                </div>
            </div>
            <PlayerHand player={opponent} isOpponent />
            <PlayerHand player={me} />

            <GameFinalScreen />
            <MulliganOverlay />
            <ArmedCardHint />
            <TargetingArrowOverlay />
            <GameAnimationOverlay />
        </div>
    );
});

export const GameRenderer = observer<GameRendererProps>(({ game, user }) => {
    const isMobilePortrait = useIsMobilePortrait();

    if (isMobilePortrait) {
        return <MobileGameLayout game={game} user={user} />;
    }

    return <DesktopGameLayout game={game} user={user} />;
});
