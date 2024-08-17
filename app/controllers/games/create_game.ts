import type { GameData } from "#api_types/game.types";
import type Deck from "#models/deck";
import Game from "#models/game";
import { generatePlayerCards } from "./generate_player_cards.js";

interface Player {
    userId: number;
    pseudo: string;
    deck: Deck;
}

interface CreateGameOptions {
    playerOne: Player;
    playerTwo: Player;
}

export const createGame = async ({ playerOne, playerTwo }: CreateGameOptions) => {
    const gameData: GameData = await getDefaultGameData({ playerOne, playerTwo });

    const game = await Game.create({
        playerOneId: playerOne.userId,
        playerTwoId: playerTwo.userId,
        data: gameData,
    });

    return game;
};

const DEFAULT_HEALTH = 30;

export const getDefaultGameData = async ({
    playerOne,
    playerTwo,
}: CreateGameOptions): Promise<GameData> => {
    return {
        state: "INIT",
        currentRound: 0,
        playerOne: {
            userId: playerOne.userId,
            pseudo: playerOne.pseudo,
            deckCards: generatePlayerCards(playerOne.deck),
            hand: [],
            board: {
                minions: [],
            },
            health: DEFAULT_HEALTH,
            mana: 0,
            weaponState: null,
        },
        playerTwo: {
            userId: playerTwo.userId,
            pseudo: playerTwo.pseudo,
            deckCards: generatePlayerCards(playerTwo.deck),
            hand: [],
            board: {
                minions: [],
            },
            health: DEFAULT_HEALTH,
            mana: 0,
            weaponState: null,
        },
        gameRounds: [],
    };
};
