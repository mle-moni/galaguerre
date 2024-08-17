import type { ApiUser } from "#api_types/auth.types";
import type { ApiGame } from "#api_types/game.types";
import { Text } from "@mantine/core";
import { PlayerHand } from "./hud/player_hand/player_hand.jsx";

export const GameRenderer = ({ game, user }: { game: ApiGame; user: ApiUser }) => {
    const me = game.data.playerOne.userId === user.id ? game.data.playerOne : game.data.playerTwo;
    const opponent =
        game.data.playerOne.userId === user.id ? game.data.playerTwo : game.data.playerOne;

    return (
        <>
            <div className="flex absolute left-0 top-0 w-[80px] h-full">
                <div className="w-full flex flex-col items-center justify-center relative bottom-12">
                    <Text size="xl">{opponent.pseudo}</Text>
                    <Text>VS</Text>
                    <Text size="xl">{me.pseudo}</Text>
                </div>
            </div>
            <PlayerHand player={opponent} isOpponent />
            <PlayerHand player={me} />
        </>
    );
};
