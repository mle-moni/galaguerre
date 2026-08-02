import { preloadDeckCardSet } from "#controllers/decks/deck_utils";
import { serializeDeck } from "#controllers/decks/serialize_deck";
import { findActiveGameForUser } from "#controllers/games/game_utils";
import Deck from "#models/deck";
import {
    cancelInvitesAsInvitee,
    cancelInvitesAsInviter,
} from "#services/game_invites/cancel_game_invites";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import { removeMatchmakingImmediately } from "#services/sockets/matchmaking";
import { WsRooms } from "#services/sockets/ws_rooms";
import { TRAINING_AI_AVATAR_CARD_ID } from "#services/avatars/avatar_cards";
import { TRAINING_AI_PSEUDO, TRAINING_AI_USER_ID } from "#services/training/training_constants";
import { loadTrainingBotCards } from "#services/training/load_training_bot_cards";
import { DEFAULT_AI_DIFFICULTY, type AiDifficulty } from "#api_types/game.types";
import type { HttpContext } from "@adonisjs/core/http";
import { ADVANCED_AI_DECKS } from "../../../database/seed_data/ai_decks.js";
import { DeckValidationError } from "../../galaguerre/validation/validate_deck.js";
import { randomBoolean, randomIntInRange } from "../../utils/random.js";
import { createGame } from "./create_game.js";

export const createTrainingGame = async (
    { auth, response }: HttpContext,
    difficulty?: AiDifficulty,
) => {
    const user = auth.user!;

    const activeGame = await findActiveGameForUser(user.id);

    if (activeGame) {
        return response.badRequest({ error: "Vous avez déjà une partie en cours" });
    }

    await cancelInvitesAsInvitee(user.id);
    await cancelInvitesAsInviter(user.id);

    removeMatchmakingImmediately(user.id);

    const deck = await Deck.query()
        .where("userId", user.id)
        .andWhere("selected", true)
        .preload("cards", preloadDeckCardSet)
        .first();

    if (!deck) return response.badRequest({ error: "You have no deck selected" });

    const serializedDeck = serializeDeck(deck);
    if (!serializedDeck.valid) {
        return response.badRequest({
            error: "Votre deck est invalide et ne peut pas être utilisé pour lancer une partie",
            details: serializedDeck.compositionErrors,
        });
    }

    const isOnboardingTutorial = !user.onboardingCompletedAt;

    // Le tutoriel s'appuie sur la main de départ exacte de l'IA historique : il force le mode
    // Débutant, quelle que soit la difficulté demandée.
    const aiDifficulty: AiDifficulty =
        isOnboardingTutorial || !difficulty ? DEFAULT_AI_DIFFICULTY : difficulty;

    const advancedDeck =
        aiDifficulty === "ADVANCED"
            ? ADVANCED_AI_DECKS[randomIntInRange(0, ADVANCED_AI_DECKS.length - 1)]!
            : null;

    const botCards = await loadTrainingBotCards(advancedDeck?.recipe);

    const humanPlayer = {
        userId: user.id,
        pseudo: user.pseudo ?? user.email.split("@")[0],
        avatarCardId: user.avatarCardId,
        deck,
    };

    const aiPlayer = {
        userId: TRAINING_AI_USER_ID,
        pseudo: TRAINING_AI_PSEUDO,
        avatarCardId: TRAINING_AI_AVATAR_CARD_ID,
        cards: botCards,
    };

    const swapSeats = isOnboardingTutorial ? false : randomBoolean();
    const playerOne = swapSeats ? aiPlayer : humanPlayer;
    const playerTwo = swapSeats ? humanPlayer : aiPlayer;

    let game;
    try {
        game = await createGame({
            playerOne,
            playerTwo,
            isTraining: true,
            isOnboardingTutorial,
            aiDifficulty,
            ...(advancedDeck ? { aiDeckProfile: advancedDeck.profile } : {}),
        });
    } catch (error) {
        if (error instanceof DeckValidationError) {
            return response.badRequest({
                error: "Invalid cards in deck",
                details: error.errors,
            });
        }

        throw error;
    }

    emitSocketEvent("game:created", { gameId: game.id }, WsRooms.personalSocketRoom(user.id));

    return { message: "Training game created", gameId: game.id };
};
