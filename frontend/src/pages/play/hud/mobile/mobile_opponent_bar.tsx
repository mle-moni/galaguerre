import type { GamePlayer } from "#api_types/game.types";
import { observer } from "mobx-react-lite";
import { MobileHeroStrip } from "./mobile_hero_strip.jsx";

interface MobileOpponentBarProps {
    opponent: GamePlayer;
}

export const MobileOpponentBar = observer(({ opponent }: MobileOpponentBarProps) => {
    return (
        <div className="mobile-bar">
            <MobileHeroStrip
                player={opponent}
                isOpponent
                deckCount={opponent.deckCards.length}
                handCount={opponent.hand.length}
            />
        </div>
    );
});
