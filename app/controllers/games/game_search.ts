import { findActiveGameForUser } from "#controllers/games/game_utils";
import Deck from "#models/deck";
import type User from "#models/user";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import {
    addMatchmakingQueueItem,
    claimOpponent,
    findQueueItemByUserId,
    removeMatchmakingQueueItem,
} from "#services/sockets/matchmaking";
import { WsRooms } from "#services/sockets/ws_rooms";
import type { HttpContext } from "@adonisjs/core/http";
import { preloadDeckCardSet } from "#controllers/decks/deck_utils";
import { serializeDeck } from "#controllers/decks/serialize_deck";
import { DeckValidationError } from "../../galaguerre/validation/validate_deck.js";
import { randomBoolean } from "../../utils/random.js";
import { createGame } from "./create_game.js";

export const gameSearch = async ({ auth, response }: HttpContext) => {
    const user = auth.user!;

    const activeGame = await findActiveGameForUser(user.id);
    if (activeGame) {
        return response.badRequest({ error: "Vous avez déjà une partie en cours" });
    }

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

    const existingQueueItem = findQueueItemByUserId(user.id);
    if (existingQueueItem) {
        existingQueueItem.lastHeartbeatAt = Date.now();
        return {
            message: "Waiting for an opponent to join...",
            searchSessionId: existingQueueItem.searchSessionId,
        };
    }

    let opponent = claimOpponent(user.id);

    while (opponent) {
        const opponentActiveGame = await findActiveGameForUser(opponent.userId);
        if (!opponentActiveGame) break;

        opponent = claimOpponent(user.id);
    }

    if (!opponent) {
        const searchSessionId = addMatchmakingQueueItem(user.id);
        return { message: "Waiting for an opponent to join...", searchSessionId };
    }

    const opponentDeck = await Deck.query()
        .where("userId", opponent.userId)
        .andWhere("selected", true)
        .preload("cards", preloadDeckCardSet)
        .preload("user")
        .first();

    if (!opponentDeck) {
        const searchSessionId = addMatchmakingQueueItem(user.id);
        return { message: "Waiting for an opponent to join...", searchSessionId };
    }

    const opponentSerializedDeck = serializeDeck(opponentDeck);
    if (!opponentSerializedDeck.valid) {
        const searchSessionId = addMatchmakingQueueItem(user.id);
        return { message: "Waiting for an opponent to join...", searchSessionId };
    }

    let game;
    try {
        const humanOne = {
            userId: opponent.userId,
            pseudo: generatePseudo(opponentDeck.user),
            deck: opponentDeck,
        };
        const humanTwo = {
            userId: user.id,
            pseudo: generatePseudo(user),
            deck,
        };

        const swapSeats = randomBoolean();
        const playerOne = swapSeats ? humanTwo : humanOne;
        const playerTwo = swapSeats ? humanOne : humanTwo;

        game = await createGame({ playerOne, playerTwo });
    } catch (error) {
        if (error instanceof DeckValidationError) {
            const searchSessionId = addMatchmakingQueueItem(user.id);
            return { message: "Waiting for an opponent to join...", searchSessionId };
        }

        throw error;
    }

    removeMatchmakingQueueItem(user.id);
    removeMatchmakingQueueItem(opponent.userId);

    const rooms = [
        WsRooms.personalSocketRoom(opponent.userId),
        WsRooms.personalSocketRoom(user.id),
    ];

    emitSocketEvent("game:created", { gameId: game.id }, rooms);

    return { message: "Game created" };
};

const generatePseudo = (user: User) => {
    return user.pseudo ?? user.email.split("@")[0];
};
