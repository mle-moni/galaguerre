import type { ApiUser } from "#api_types/auth.types";
import type { ApiGame } from "#api_types/game.types";

import { Board } from "./board/board.jsx";
import { DecksInfos } from "./hud/decks_infos/decks_infos.jsx";
import { GameFinalScreen } from "./hud/game_final_screen/game_final_screen.jsx";
import { PlayerHand } from "./hud/player_hand/player_hand.jsx";
import { PlayersInfos } from "./hud/players_infos/players_infos.jsx";

export const GameRenderer = ({ game, user }: { game: ApiGame; user: ApiUser }) => {
    const me = game.data.playerOne.userId === user.id ? game.data.playerOne : game.data.playerTwo;
    const opponent =
        game.data.playerOne.userId === user.id ? game.data.playerTwo : game.data.playerOne;

    return (
        <>
            <div className="flex h-full">
                <div className="flex justify-center w-[124px]">
                    <PlayersInfos me={me} opponent={opponent} />
                </div>
                <div className="bg-blue-400 flex-1">
                    <Board />
                </div>
                <div className="flex justify-center w-[124px]">
                    <DecksInfos me={me} opponent={opponent} />
                </div>
            </div>
            <PlayerHand player={opponent} isOpponent />
            <PlayerHand player={me} />

            <GameFinalScreen />
        </>
    );
};
