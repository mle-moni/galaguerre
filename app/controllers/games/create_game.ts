import type { GameData } from "#api_types/game.types";
import type Deck from "#models/deck";
import Game from "#models/game";
import { generatePlayerCards } from "./generate_player_cards.js";
import { setupNextGameTurn } from "./setup_next_game_turn.js";

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
    // wait 3s then make player one draw and start the game
    setTimeout(() => {
        setupNextGameTurn(game);
    }, 3000);

    return game;
};

const DEFAULT_HAND_SIZE = 3;
const DEFAULT_HEALTH = 15;

export const getDefaultGameData = async ({
    playerOne,
    playerTwo,
}: CreateGameOptions): Promise<GameData> => {
    const p1Deck = generatePlayerCards(playerOne.deck);
    const p1Hand = p1Deck.slice(0, DEFAULT_HAND_SIZE);
    const p1DeckCards = p1Deck.slice(DEFAULT_HAND_SIZE);

    const p2Deck = generatePlayerCards(playerTwo.deck);
    const p2Hand = p2Deck.slice(0, DEFAULT_HAND_SIZE);
    const p2DeckCards = p2Deck.slice(DEFAULT_HAND_SIZE);

    return {
        state: "INIT",
        currentRound: 0,
        playerOne: {
            userId: playerOne.userId,
            pseudo: playerOne.pseudo,
            deckCards: p1DeckCards,
            hand: p1Hand,
            board: {
                SPOT_1: null,
                SPOT_2: null,
                SPOT_3: null,
                SPOT_4: null,
                SPOT_5: null,
            },
            health: DEFAULT_HEALTH,
            mana: 0,
            maxFatigueDamageTaken: 0,
            weaponState: null,
        },
        playerTwo: {
            userId: playerTwo.userId,
            pseudo: playerTwo.pseudo,
            deckCards: p2DeckCards,
            hand: p2Hand,
            board: {
                SPOT_1: null,
                SPOT_2: null,
                SPOT_3: null,
                SPOT_4: null,
                SPOT_5: null,
            },
            health: DEFAULT_HEALTH,
            mana: 0,
            maxFatigueDamageTaken: 0,
            weaponState: null,
        },
        gameRounds: [],
    };
};
