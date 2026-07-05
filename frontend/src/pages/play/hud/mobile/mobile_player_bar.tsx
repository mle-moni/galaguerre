import type { GamePlayer } from "#api_types/game.types";
import { Button } from "@mantine/core";
import clsx from "clsx";
import { observer } from "mobx-react-lite";
import { useGameContext } from "~/hooks/use_game_state";
import { MobileCountdownTimer } from "./mobile_countdown_timer.jsx";
import { MobileHeroStrip } from "./mobile_hero_strip.jsx";

interface MobilePlayerBarProps {
    me: GamePlayer;
}

export const MobilePlayerBar = observer(({ me }: MobilePlayerBarProps) => {
    const { store } = useGameContext();

    return (
        <div className="mobile-bar mobile-bar--player">
            <MobileHeroStrip player={me} deckCount={me.deckCards.length} />
            <div
                className={clsx(
                    "mobile-bar__actions",
                    !store.isMyTurn && "mobile-bar__actions--hidden",
                )}
                aria-hidden={!store.isMyTurn}
            >
                <MobileCountdownTimer
                    endsAt={store.game.data.turnEndsAt}
                    label="Temps restant"
                    description="Temps qu'il vous reste pour jouer. À 0, votre tour se termine automatiquement."
                />
                <Button
                    size="compact-sm"
                    variant="filled"
                    loading={store.isPassTurnPending}
                    disabled={!store.canPassTurn}
                    onClick={() => store.requestPassTurn()}
                    tabIndex={store.isMyTurn ? 0 : -1}
                >
                    Terminé
                </Button>
            </div>
        </div>
    );
});
