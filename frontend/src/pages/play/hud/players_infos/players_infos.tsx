import type { GamePlayer } from "#api_types/game.types";

import { Text } from "@mantine/core";
import { PlayerInfos } from "./player_infos.jsx";

interface PlayerInfosProps {
    me: GamePlayer;
    opponent: GamePlayer;
}

export const PlayersInfos = ({ me, opponent }: PlayerInfosProps) => {
    return (
        <div className="flex-1 mx-1 flex flex-col items-center justify-center ">
            <PlayerInfos player={opponent} isOpponent />
            <Text className="m-2">VS</Text>
            <PlayerInfos player={me} />
        </div>
    );
};
