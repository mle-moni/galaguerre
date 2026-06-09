import type { GamePlayer } from "#api_types/game.types";
import { Button, Stack } from "@mantine/core";
import { observer } from "mobx-react-lite";
import { useGameContext } from "~/hooks/use_game_state";
import { passTurn } from "~/services/ws_client";
import { CountdownTimer } from "../countdown_timer/countdown_timer.jsx";
import { MobileHeroStrip } from "./mobile_hero_strip.jsx";

interface MobilePlayerBarProps {
    me: GamePlayer;
}

export const MobilePlayerBar = observer(({ me }: MobilePlayerBarProps) => {
    const { store } = useGameContext();

    return (
        <div className="mobile-bar mobile-bar--player">
            <MobileHeroStrip player={me} deckCount={me.deckCards.length} />
            {store.isMyTurn && (
                <Stack gap={4} align="center">
                    <CountdownTimer endsAt={store.game.data.turnEndsAt} />
                    <Button size="compact-sm" variant="filled" onClick={passTurn}>
                        Terminé
                    </Button>
                </Stack>
            )}
        </div>
    );
});
