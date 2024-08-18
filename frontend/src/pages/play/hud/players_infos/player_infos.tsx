import type { GamePlayer } from "#api_types/game.types";

import { Text } from "@mantine/core";
import { useMemo } from "react";
import { useGameContext, useIsMyTurn } from "~/hooks/use_game_state";

interface PlayerInfosProps {
    player: GamePlayer;
    isOpponent?: boolean;
}

export const PlayerInfos = ({ player, isOpponent }: PlayerInfosProps) => {
    const isMyTurn = useIsMyTurn();
    const gameState = useGameContext().game.data.state;
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

    const borderColor = useMemo(() => {
        if (gameState === "INIT") return "yellow";

        const opponentAndHisTurn = isOpponent && !isMyTurn;
        const meAndMyTurn = !isOpponent && isMyTurn;

        if (meAndMyTurn || opponentAndHisTurn) return "#2ae32a";

        return "white";
    }, [isMyTurn, isOpponent, gameState]);

    return (
        <div
            className="rounded-full border-2 border-solid p-4 w-full mx-2"
            style={{
                borderColor,
            }}
        >
            {elements}
        </div>
    );
};
