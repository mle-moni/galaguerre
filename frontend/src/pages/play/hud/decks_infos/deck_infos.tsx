import type { GamePlayer } from "#api_types/game.types";
import { Button } from "@mantine/core";
import { IconPlayCard } from "@tabler/icons-react";
import { observer } from "mobx-react-lite";
import { useGameContext } from "~/hooks/use_game_state";
import { passTurn } from "~/services/ws_client";

interface DeckInfosProps {
    player: GamePlayer;
    isOpponent?: boolean;
}

const filler = <div className="h-[80px]" />;

export const DeckInfos = observer(({ player, isOpponent }: DeckInfosProps) => {
    const numberOfCards = player.deckCards.length;
    const iconSize = getIconSize(numberOfCards);

    return (
        <div className="flex flex-col w-full">
            {isOpponent && filler}
            <div className="flex h-[80px] items-center">
                <p className="flex-1 mr-2 text-right text-xl">{numberOfCards}</p>
                <IconPlayCard className="flex-1" size={iconSize} />
            </div>
            {!isOpponent && (
                <div className="h-[80px] flex justify-center">
                    <PlayerButton />
                </div>
            )}
        </div>
    );
});

const PlayerButton = observer(() => {
    const { store } = useGameContext();

    if (store.isMyTurn) {
        return (
            <Button variant="filled" onClick={passTurn}>
                Terminé
            </Button>
        );
    }

    return null;
});

const getIconSize = (numCards: number): number => {
    const NUM_CARDS_MIN = 0;
    const NUM_CARDS_MAX = 30;
    const MIN_SIZE = 22;
    const MAX_SIZE = 50;

    const numCardOrMax = numCards > NUM_CARDS_MAX ? NUM_CARDS_MAX : numCards;

    return (
        MIN_SIZE +
        ((numCardOrMax - NUM_CARDS_MIN) / (NUM_CARDS_MAX - NUM_CARDS_MIN)) * (MAX_SIZE - MIN_SIZE)
    );
};
