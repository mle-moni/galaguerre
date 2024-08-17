import "./game.css";

import type { ApiUser } from "#api_types/auth.types";
import type { ApiGame } from "#api_types/game.types";
import { Container, Stage, Text } from "@pixi/react";
import { useDimensions } from "~/hooks/use_dimensions";
import { PlayerHand } from "./hud/player_hand.js";

export const GameRenderer = ({ game, user }: { game: ApiGame; user: ApiUser }) => {
    const dimensions = useDimensions();
    const me = game.data.playerOne.userId === user.id ? game.data.playerOne : game.data.playerTwo;
    const opponent =
        game.data.playerOne.userId === user.id ? game.data.playerTwo : game.data.playerOne;

    const textCenter = dimensions.height / 2 - 50;

    return (
        <>
            <Stage
                width={dimensions.width}
                height={dimensions.height}
                options={{ backgroundColor: 0xda9854 }}
            >
                <Container>
                    <Text text={opponent.pseudo} x={20} y={textCenter - 50} />
                    <Text text="VS" x={20} y={textCenter} />
                    <Text text={me.pseudo} x={20} y={textCenter + 50} />
                </Container>
            </Stage>
            <PlayerHand player={opponent} isOpponent />
            <PlayerHand player={me} />
        </>
    );
};
