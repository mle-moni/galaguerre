import type { GamePlayer } from "#api_types/game.types";
import clsx from "clsx";
import { observer } from "mobx-react-lite";
import { useGameContext } from "~/hooks/use_game_state";
import { TURN_TIMER_DISPLAY_OFFSET_SECONDS } from "../../play_game_constants.js";
import { MobileCountdownTimer } from "./mobile_countdown_timer.jsx";
import { MobileHeroStrip } from "./mobile_hero_strip.jsx";

interface MobileOpponentBarProps {
    opponent: GamePlayer;
}

export const MobileOpponentBar = observer(({ opponent }: MobileOpponentBarProps) => {
    const { store } = useGameContext();

    return (
        <div className="mobile-bar">
            <MobileHeroStrip
                player={opponent}
                isOpponent
                deckCount={opponent.deckCards.length}
                handCount={opponent.hand.length}
            />
            <div
                className={clsx(
                    "mobile-bar__actions",
                    store.isMyTurn && "mobile-bar__actions--hidden",
                )}
                aria-hidden={store.isMyTurn}
            >
                <MobileCountdownTimer
                    endsAt={store.game.data.turnEndsAt}
                    displayOffsetSeconds={TURN_TIMER_DISPLAY_OFFSET_SECONDS}
                    label="Temps restant"
                    description="Temps qu'il reste à l'adversaire pour jouer son tour."
                />
            </div>
        </div>
    );
});
