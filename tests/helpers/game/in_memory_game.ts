import type { GameData } from "#api_types/game.types";
import type Game from "#models/game";

export const createInMemoryGame = (data: GameData): Game => {
    const game = {
        id: 1,
        data,
        isFinished: false,
        save: async () => {},
        refresh: async () => {},
        getApiJson: (_forUserId: number) => ({
            id: 1,
            data,
            isFinished: game.isFinished,
        }),
    };

    return game as unknown as Game;
};
