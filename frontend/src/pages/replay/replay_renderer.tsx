import "../play/play_page.css";
import "../play/game_layout.css";

import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { GameAnimationOverlay } from "../play/animations/game_animation_overlay.jsx";
import { Board } from "../play/board/board.jsx";
import { DecksInfos } from "../play/hud/decks_infos/decks_infos.jsx";
import { PlayerHand } from "../play/hud/player_hand/player_hand.jsx";
import { PlayedCardReveal } from "../play/hud/played_card_reveal/played_card_reveal.jsx";
import { PlayersInfos } from "../play/hud/players_infos/players_infos.jsx";
import { ReplayStoreContext } from "~/hooks/use_game_state";
import { useIsMobilePortrait } from "~/hooks/use_is_mobile_portrait";
import { _assert } from "~/helpers/assertions";

const DesktopReplayLayout = observer(() => {
    const replayStore = useContext(ReplayStoreContext);
    _assert(replayStore, "ReplayRenderer must be used within ReplayStoreContext");

    const me = replayStore.me;
    const opponent = replayStore.opponent;

    return (
        <div className="h-full relative">
            <div className="flex h-full">
                <div className="flex justify-center w-[124px] shrink-0">
                    <PlayersInfos me={me} opponent={opponent} />
                </div>
                <div className="bg-blue-400 flex-1 flex flex-col min-h-0 relative">
                    <PlayedCardReveal />
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
            <GameAnimationOverlay />
        </div>
    );
});

export const ReplayRenderer = observer(() => {
    const isMobilePortrait = useIsMobilePortrait();

    if (isMobilePortrait) {
        return (
            <div className="p-4 text-center text-white/80">
                Le replay est disponible en mode paysage ou sur ordinateur.
            </div>
        );
    }

    return <DesktopReplayLayout />;
});
