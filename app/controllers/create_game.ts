import Game from "#models/game";
import type User from "#models/user";
import type { GameData } from "../galaguerre/game.types.js";

interface CreateGameOptions {
    playerOne: User;
    playerTwo: User;
}

export const createGame = async ({ playerOne, playerTwo }: CreateGameOptions) => {
    const gameData: GameData = getDefaultGameData({ playerOne, playerTwo });

    const game = await Game.create({
        playerOneId: playerOne.id,
        playerTwoId: playerTwo.id,
        data: gameData,
    });

    return game;
};

const DEFAULT_HEALTH = 30;

export const getDefaultGameData = ({ playerOne, playerTwo }: CreateGameOptions): GameData => ({
    currentRound: 0,
    playerOne: {
        userId: playerOne.id,
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
        userId: playerTwo.id,
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
