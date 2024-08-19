import type { GamePlayer } from "#api_types/game.types";

import { Text } from "@mantine/core";
import { observer } from "mobx-react-lite";
import { DeckInfos } from "./deck_infos.jsx";

interface DecksInfosProps {
    me: GamePlayer;
    opponent: GamePlayer;
}

export const DecksInfos = observer(({ me, opponent }: DecksInfosProps) => {
    return (
        <div className="flex-1 mx-1 flex flex-col items-center justify-center ">
            <DeckInfos player={opponent} isOpponent />
            <Text className="m-2">VS</Text>
            <DeckInfos player={me} />
        </div>
    );
});
