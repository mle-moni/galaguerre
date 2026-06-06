import type { GameData } from "#api_types/game.types";
import Game from "#models/game";
import User from "#models/user";

export type PlayerKey = "playerOne" | "playerTwo";

export const createTestUsers = async () => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const playerOne = await User.create({
        email: `p1-${unique}@test.fr`,
        password: "test",
    });

    const playerTwo = await User.create({
        email: `p2-${unique}@test.fr`,
        password: "test",
    });

    return { playerOne, playerTwo };
};

export const createOutsiderUser = async () => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    return User.create({
        email: `outsider-${unique}@test.fr`,
        password: "test",
    });
};

export const bindUserIds = (data: GameData, playerOneId: number, playerTwoId: number): GameData => ({
    ...data,
    playerOne: { ...data.playerOne, userId: playerOneId },
    playerTwo: { ...data.playerTwo, userId: playerTwoId },
});

export interface CreateTestGameOptions {
    isFinished?: boolean;
}

export const createTestGame = async (data: GameData, options: CreateTestGameOptions = {}) => {
    const { playerOne, playerTwo } = await createTestUsers();
    const boundData = bindUserIds(data, playerOne.id, playerTwo.id);

    const game = await Game.create({
        playerOneId: playerOne.id,
        playerTwoId: playerTwo.id,
        data: boundData,
        isFinished: options.isFinished ?? false,
    });

    return { game, playerOne, playerTwo };
};

export const getActorUserId = (
    playerOne: User,
    playerTwo: User,
    actor: PlayerKey,
): number => (actor === "playerOne" ? playerOne.id : playerTwo.id);
