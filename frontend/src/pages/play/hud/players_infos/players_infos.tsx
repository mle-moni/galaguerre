import type { GamePlayer } from "#api_types/game.types";

import { observer } from "mobx-react-lite";
import { PlayerInfos } from "./player_infos.jsx";

interface PlayersInfosProps {
    me: GamePlayer;
    opponent: GamePlayer;
}

export const PlayersInfos = observer<PlayersInfosProps>(({ me, opponent }) => {
    return (
        <div className="flex-1 px-1 flex flex-col items-center justify-center">
            <PlayerInfos player={opponent} label="Adversaire" isOpponent />
            <span className="play-sidebar-vs" aria-hidden>
                VS
            </span>
            <PlayerInfos player={me} label="Vous" />
        </div>
    );
});
