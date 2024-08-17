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
            <div className="flex absolute left-0 top-0 w-[120px] h-full">
                <div className="w-full flex flex-col items-center justify-center relative bottom-12">
                    <div className="rounded-full border-2 border-white border-solid p-4">
                        <Text size="lg" ta="center">
                            {opponent.health} pdv
                        </Text>
                        <Text size="xl" ta="center">
                            {opponent.pseudo}
                        </Text>
                    </div>
                    <Text className="m-2">VS</Text>
                    <div className="rounded-full border-2 border-white border-solid p-4">
                        <Text size="xl" ta="center">
                            {me.pseudo}
                        </Text>
                        <Text size="lg" ta="center">
                            {me.health} pdv
                        </Text>
                    </div>
                </div>
            </div>
            <PlayerHand player={opponent} isOpponent />
            <PlayerHand player={me} />
        </>
    );
};
