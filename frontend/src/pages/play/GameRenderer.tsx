import type { ApiUser } from "#api_types/auth.types";
import type { ApiGame } from "#api_types/game.types";
import { Container, Stage, Text } from "@pixi/react";
import { useDimensions } from "~/hooks/useDimensions";

import "./game.css";
import { PlayerHand } from "./hud/PlayerHand.jsx";

export const GameRenderer = ({ game, user }: { game: ApiGame; user: ApiUser }) => {
    const dimensions = useDimensions();
    const me = game.data.playerOne.userId === user.id ? game.data.playerOne : game.data.playerTwo;
    const opponent =
        game.data.playerOne.userId === user.id ? game.data.playerTwo : game.data.playerOne;

    return (
        <>
            <Stage
                width={dimensions.width}
                height={dimensions.height}
                options={{ backgroundColor: 0xda9854 }}
            >
                <Container>
                    <Text text={opponent.pseudo} x={20} y={10} />
                    <Text text={me.pseudo} x={20} y={dimensions.height - 40} />
                </Container>
            </Stage>
            <PlayerHand player={opponent} isOpponent />
            <PlayerHand player={me} />
        </>
    );
};
