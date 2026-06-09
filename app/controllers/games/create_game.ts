import { DEFAULT_HERO_HEALTH, DEFAULT_PLAYER_STATS, type GameData } from "#api_types/game.types";
import { deckCardsToEntries } from "#controllers/decks/deck_utils";
import { assertDeckValid } from "../../galaguerre/validation/validate_deck.js";
import { validateDeckComposition } from "../../galaguerre/validation/validate_deck_composition.js";
import type Card from "#models/card";
import type Deck from "#models/deck";
import Game from "#models/game";
import { scheduleAiMulliganIfNeeded } from "../../galaguerre/ai/schedule_ai_mulligan.js";
import { startMulliganTimer } from "../../galaguerre/timers/game_timers.js";
import { generatePlayerCards } from "./generate_player_cards.js";
import { sendGameUpdate } from "./send_game_update.js";

interface HumanPlayer {
    userId: number;
    pseudo: string;
    deck: Deck;
}

interface AiPlayer {
    userId: number;
    pseudo: string;
    cards: Card[];
}

interface CreateGameOptions {
    playerOne: HumanPlayer | AiPlayer;
    playerTwo: HumanPlayer | AiPlayer;
    isTraining?: boolean;
}

export const isAiPlayer = (player: HumanPlayer | AiPlayer): player is AiPlayer => "cards" in player;

const assertDeckPlayable = (deck: Deck) => {
    const composition = validateDeckComposition(deckCardsToEntries(deck));
    if (!composition.valid) {
        throw new Error(composition.errors[0]?.reason ?? "Deck invalide");
    }

    assertDeckValid(deck);
};

export const createGame = async ({ playerOne, playerTwo, isTraining }: CreateGameOptions) => {
    if (!isAiPlayer(playerOne)) {
        assertDeckPlayable(playerOne.deck);
    }
    if (!isAiPlayer(playerTwo)) {
        assertDeckPlayable(playerTwo.deck);
    }

    const gameData: GameData = getDefaultGameData({ playerOne, playerTwo, isTraining });

    const game = await Game.create({
        playerOneId: isAiPlayer(playerOne) ? null : playerOne.userId,
        playerTwoId: isAiPlayer(playerTwo) ? null : playerTwo.userId,
        data: gameData,
    });

    startMulliganTimer(game);
    await game.save();
    sendGameUpdate(game);
    scheduleAiMulliganIfNeeded(game);

    return game;
};

const PLAYER_ONE_HAND_SIZE = 3;
const PLAYER_TWO_HAND_SIZE = 4;

const createEmptyBoard = () => ({
    SPOT_1: null,
    SPOT_2: null,
    SPOT_3: null,
    SPOT_4: null,
    SPOT_5: null,
});

const createGamePlayer = (
    userId: number,
    pseudo: string,
    handSize: number,
    deck: ReturnType<typeof generatePlayerCards>,
) => {
    const hand = deck.slice(0, handSize);
    const deckCards = deck.slice(handSize);

    return {
        userId,
        pseudo,
        deckCards,
        hand,
        board: createEmptyBoard(),
        health: DEFAULT_HERO_HEALTH,
        spellPower: 0,
        mana: 0,
        maxFatigueDamageTaken: 0,
        weaponState: null,
        heroAttacksThisRound: 0,
        heroLastAttackAtRound: 0,
        stats: { ...DEFAULT_PLAYER_STATS },
    };
};

export const getDefaultGameData = ({
    playerOne,
    playerTwo,
    isTraining,
}: CreateGameOptions): GameData => {
    const p1Source = isAiPlayer(playerOne) ? playerOne.cards : playerOne.deck;
    const p2Source = isAiPlayer(playerTwo) ? playerTwo.cards : playerTwo.deck;

    const p1Deck = generatePlayerCards(p1Source);
    const p2Deck = generatePlayerCards(p2Source);

    return {
        state: "MULLIGAN",
        currentRound: 0,
        mulligan: {
            playerOneDone: false,
            playerTwoDone: false,
        },
        playerOne: createGamePlayer(
            playerOne.userId,
            playerOne.pseudo,
            PLAYER_ONE_HAND_SIZE,
            p1Deck,
        ),
        playerTwo: createGamePlayer(
            playerTwo.userId,
            playerTwo.pseudo,
            PLAYER_TWO_HAND_SIZE,
            p2Deck,
        ),
        actionLog: [],
        ...(isTraining ? { isTraining: true } : {}),
    };
};
