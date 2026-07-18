import { createEmptyBoard } from "#api_types/board";
import { DEFAULT_HERO_HEALTH, DEFAULT_PLAYER_STATS, type GameData } from "#api_types/game.types";
import { deckCardsToEntries } from "#controllers/decks/deck_utils";
import { assertDeckValid } from "../../galaguerre/validation/validate_deck.js";
import { validateDeckCollectible } from "../../galaguerre/validation/validate_deck_collectible.js";
import { validateDeckComposition } from "../../galaguerre/validation/validate_deck_composition.js";
import type Card from "#models/card";
import type Deck from "#models/deck";
import Game from "#models/game";
import { confirmAiMulliganIfNeeded } from "../../galaguerre/ai/schedule_ai_mulligan.js";
import { startMulliganTimer } from "../../galaguerre/timers/game_timers.js";
import {
    arrangeOnboardingTutorialDeck,
    ONBOARDING_AI_OPENING_HAND_CARD_IDS,
    ONBOARDING_HUMAN_MULLIGAN_TOP_CARD_IDS,
    ONBOARDING_HUMAN_OPENING_HAND_CARD_IDS,
} from "#services/onboarding/arrange_onboarding_tutorial_deck";
import { getUserCollectionGoldenCounts } from "#services/collection/get_user_collection_counts";
import { generatePlayerCards } from "./generate_player_cards.js";
import { sendGameUpdate } from "./send_game_update.js";

interface HumanPlayer {
    userId: number;
    pseudo: string;
    avatarCardId: number;
    deck: Deck;
}

interface AiPlayer {
    userId: number;
    pseudo: string;
    avatarCardId: number;
    cards: Card[];
}

interface CreateGameOptions {
    playerOne: HumanPlayer | AiPlayer;
    playerTwo: HumanPlayer | AiPlayer;
    isTraining?: boolean;
    isFriendly?: boolean;
    isOnboardingTutorial?: boolean;
}

export const isAiPlayer = (player: HumanPlayer | AiPlayer): player is AiPlayer => "cards" in player;

const assertDeckPlayable = (deck: Deck) => {
    const composition = validateDeckComposition(deckCardsToEntries(deck));
    if (!composition.valid) {
        throw new Error(composition.errors[0]?.reason ?? "Deck invalide");
    }

    const collectible = validateDeckCollectible(deck.cards);
    if (!collectible.valid) {
        throw new Error(collectible.errors[0]?.reason ?? "Deck invalide");
    }

    assertDeckValid(deck);
};

export const createGame = async ({
    playerOne,
    playerTwo,
    isTraining,
    isFriendly,
    isOnboardingTutorial,
}: CreateGameOptions) => {
    if (!isAiPlayer(playerOne)) {
        assertDeckPlayable(playerOne.deck);
    }
    if (!isAiPlayer(playerTwo)) {
        assertDeckPlayable(playerTwo.deck);
    }

    const [playerOneGoldenCounts, playerTwoGoldenCounts] = await Promise.all([
        isAiPlayer(playerOne)
            ? Promise.resolve(new Map<number, number>())
            : getUserCollectionGoldenCounts(playerOne.userId),
        isAiPlayer(playerTwo)
            ? Promise.resolve(new Map<number, number>())
            : getUserCollectionGoldenCounts(playerTwo.userId),
    ]);

    const gameData: GameData = getDefaultGameData({
        playerOne,
        playerTwo,
        isTraining,
        isFriendly,
        isOnboardingTutorial,
        playerOneGoldenCounts,
        playerTwoGoldenCounts,
    });

    const game = await Game.create({
        playerOneId: isAiPlayer(playerOne) ? null : playerOne.userId,
        playerTwoId: isAiPlayer(playerTwo) ? null : playerTwo.userId,
        data: gameData,
    });

    startMulliganTimer(game);
    await game.save();

    if (isTraining) {
        await confirmAiMulliganIfNeeded(game);
        await game.refresh();
    }

    sendGameUpdate(game);

    return game;
};

const PLAYER_ONE_HAND_SIZE = 3;
const PLAYER_TWO_HAND_SIZE = 4;

const createGamePlayer = (
    userId: number,
    pseudo: string,
    avatarCardId: number,
    handSize: number,
    deck: ReturnType<typeof generatePlayerCards>,
) => {
    const hand = deck.slice(0, handSize);
    const deckCards = deck.slice(handSize);

    return {
        userId,
        pseudo,
        avatarCardId,
        deckCards,
        hand,
        board: createEmptyBoard(),
        health: DEFAULT_HERO_HEALTH,
        spellPower: 0,
        extraBattlecryTriggers: 0,
        cardsPlayedThisTurn: 0,
        mana: 0,
        maxFatigueDamageTaken: 0,
        weaponState: null,
        heroAttacksThisRound: 0,
        heroLastAttackAtRound: 0,
        stats: { ...DEFAULT_PLAYER_STATS },
    };
};

type GetDefaultGameDataOptions = CreateGameOptions & {
    playerOneGoldenCounts?: Map<number, number>;
    playerTwoGoldenCounts?: Map<number, number>;
};

export const getDefaultGameData = ({
    playerOne,
    playerTwo,
    isTraining,
    isFriendly,
    isOnboardingTutorial,
    playerOneGoldenCounts,
    playerTwoGoldenCounts,
}: GetDefaultGameDataOptions): GameData => {
    const p1Source = isAiPlayer(playerOne) ? playerOne.cards : playerOne.deck;
    const p2Source = isAiPlayer(playerTwo) ? playerTwo.cards : playerTwo.deck;

    const p1Deck = buildPlayerDeckOrder(p1Source, {
        isOnboardingTutorial,
        isHuman: !isAiPlayer(playerOne),
        goldenCounts: playerOneGoldenCounts,
    });
    const p2Deck = buildPlayerDeckOrder(p2Source, {
        isOnboardingTutorial,
        isHuman: !isAiPlayer(playerTwo),
        goldenCounts: playerTwoGoldenCounts,
    });

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
            playerOne.avatarCardId,
            PLAYER_ONE_HAND_SIZE,
            p1Deck,
        ),
        playerTwo: createGamePlayer(
            playerTwo.userId,
            playerTwo.pseudo,
            playerTwo.avatarCardId,
            PLAYER_TWO_HAND_SIZE,
            p2Deck,
        ),
        actionLog: [],
        ...(isTraining ? { isTraining: true } : {}),
        ...(isFriendly ? { isFriendly: true } : {}),
        ...(isOnboardingTutorial ? { isOnboardingTutorial: true } : {}),
    };
};

const buildPlayerDeckOrder = (
    source: Deck | Card[],
    options: {
        isOnboardingTutorial?: boolean;
        isHuman: boolean;
        goldenCounts?: Map<number, number>;
    },
): ReturnType<typeof generatePlayerCards> => {
    if (!options.isOnboardingTutorial) {
        return generatePlayerCards(source, { goldenCounts: options.goldenCounts });
    }

    const cards = generatePlayerCards(source, {
        shuffle: false,
        goldenCounts: options.goldenCounts,
    });

    if (options.isHuman) {
        return arrangeOnboardingTutorialDeck(
            cards,
            ONBOARDING_HUMAN_OPENING_HAND_CARD_IDS,
            ONBOARDING_HUMAN_MULLIGAN_TOP_CARD_IDS,
        );
    }

    return arrangeOnboardingTutorialDeck(cards, ONBOARDING_AI_OPENING_HAND_CARD_IDS, []);
};
