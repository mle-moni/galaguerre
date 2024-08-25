import type { GamePlayer } from "#api_types/game.types";

import { Text } from "@mantine/core";
import { observer } from "mobx-react-lite";
import { useMemo } from "react";
import { useGameContext } from "~/hooks/use_game_state";

interface PlayerInfosProps {
    player: GamePlayer;
    isOpponent?: boolean;
}

export const PlayerInfos = observer<PlayerInfosProps>(({ player, isOpponent = false }) => {
    const { store } = useGameContext();
    const elements = useMemo(() => {
        const jsxArray = [
            <Text key="PSEUDO" size="xl" ta="center">
                {player.pseudo}
            </Text>,
            <Text key="HEALTH" size="lg" ta="center">
                {player.health} pdv
            </Text>,
            <Text key="MANA" size="sm" ta="center">
                {player.mana} mana
            </Text>,
        ];

        if (isOpponent) {
            return jsxArray.reverse();
        }

        return jsxArray;
    }, [player, isOpponent]);

    const borderColor = store.playerInfosStore.getBorderColor({
        isOpponent,
    });

    const minionAttackBorderColor = store.minionDragStore.getPlayerBorderColor(isOpponent);

    const handleDrop = () => {
        store.handleDrop(null, isOpponent ? "OPPONENT" : "PLAYER");
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        const minion = store.minionDragStore.minionDragged;

        if (!minion) return;

        // authorize card drop
        e.preventDefault();
    };

    return (
        <div
            className="border-2 border-dashed w-full mx-2"
            style={{
                borderColor: minionAttackBorderColor,
            }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <div
                className="rounded-full border-2 border-solid w-full p-4"
                style={{
                    borderColor,
                }}
            >
                {elements}
            </div>
        </div>
    );
});
