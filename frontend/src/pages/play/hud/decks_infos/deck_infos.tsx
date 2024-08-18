import type { GamePlayer } from "#api_types/game.types";
import { Text } from "@mantine/core";
import { IconPlayCard } from "@tabler/icons-react";

interface DeckInfosProps {
    player: GamePlayer;
    isOpponent?: boolean;
}

export const DeckInfos = ({ player }: DeckInfosProps) => {
    const numberOfCards = player.deckCards.length;
    const iconSize = getIconSize(numberOfCards);

    return (
        <div>
            <div className="flex h-[80px] justify-between items-center">
                <Text className="flex-1" size="xl" ta="center">
                    {numberOfCards}
                </Text>
                <IconPlayCard className="flex-1" size={iconSize} />
            </div>
        </div>
    );
};

const getIconSize = (numberOfCards: number) => {
    // NUM_CARDS_MIN 0 -> SIZE_MIN 40
    // NUM_CARDS_MAX 30 -> SIZE_MAX 80
    // SIZE_X = (4 * NC_X) / 3 + 40
    const ncX = numberOfCards > 30 ? 30 : numberOfCards;
    const sizeX = (4 * ncX) / 3 + 40;

    return sizeX;
};
