import type { GamePlayer } from "#api_types/game.types";
import type Game from "#models/game";

export const whichPlayerAmI = (
    game: Game,
    userId: number,
): { player: GamePlayer; playerType: "PLAYER_ONE" | "PLAYER_TWO" } => {
    const p1 = game.data.playerOne;
    const p2 = game.data.playerTwo;

    if (p1.userId === userId)
        return {
            player: p1,
            playerType: "PLAYER_ONE",
        };

    return {
        player: p2,
        playerType: "PLAYER_TWO",
    };
};
