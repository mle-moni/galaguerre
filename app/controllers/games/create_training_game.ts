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
import { TRAINING_AI_PSEUDO, TRAINING_AI_USER_ID } from "#services/training/training_constants";
import { loadTrainingBotCards } from "#services/training/load_training_bot_cards";
import type { HttpContext } from "@adonisjs/core/http";
import { DeckValidationError } from "../../galaguerre/validation/validate_deck.js";
import { randomBoolean } from "../../utils/random.js";
import { createGame } from "./create_game.js";

export const createTrainingGame = async ({ auth, response }: HttpContext) => {
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

    const botCards = await loadTrainingBotCards();

    const isOnboardingTutorial = !user.onboardingCompletedAt;

    const humanPlayer = {
        userId: user.id,
        pseudo: user.pseudo ?? user.email.split("@")[0],
        deck,
    };

    const aiPlayer = {
        userId: TRAINING_AI_USER_ID,
        pseudo: TRAINING_AI_PSEUDO,
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
