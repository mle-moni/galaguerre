import type { GameData } from "#api_types/game.types";
import Game from "#models/game";

interface CreateGameOptions {
    playerOneId: number;
    playerTwoId: number;
}

export const createGame = async ({ playerOneId, playerTwoId }: CreateGameOptions) => {
    const gameData: GameData = getDefaultGameData({ playerOneId, playerTwoId });

    const game = await Game.create({
        playerOneId,
        playerTwoId,
        data: gameData,
    });

    return game;
};

const DEFAULT_HEALTH = 30;

export const getDefaultGameData = ({ playerOneId, playerTwoId }: CreateGameOptions): GameData => ({
    currentRound: 0,
    playerOne: {
        userId: playerOneId,
        deck: [],
        hand: [],
        board: {
            minions: [],
        },
        health: DEFAULT_HEALTH,
        mana: 0,
        weaponState: null,
    },
    playerTwo: {
        userId: playerTwoId,
        deck: [],
        hand: [],
        board: {
            minions: [],
        },
        health: DEFAULT_HEALTH,
        mana: 0,
        weaponState: null,
    },
    gameRounds: [],
});
