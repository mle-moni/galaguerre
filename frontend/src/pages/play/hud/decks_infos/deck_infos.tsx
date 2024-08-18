import type { GamePlayer } from "#api_types/game.types";
import { Button } from "@mantine/core";
import { IconPlayCard } from "@tabler/icons-react";

interface DeckInfosProps {
    player: GamePlayer;
    isOpponent?: boolean;
}

export const DeckInfos = ({ player, isOpponent }: DeckInfosProps) => {
    const numberOfCards = player.deckCards.length;
    const iconSize = getIconSize(numberOfCards);

    return (
        <div className="flex flex-col w-full">
            {isOpponent && <div className="h-[80px]" />}
            <div className="flex h-[80px] items-center">
                <p className="flex-1 mr-2 text-right text-xl">{numberOfCards}</p>
                <IconPlayCard className="flex-1" size={iconSize} />
            </div>
            {!isOpponent && (
                <div className="h-[80px]">
                    <Button variant="filled">Terminé</Button>
                </div>
            )}
        </div>
    );
};

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
