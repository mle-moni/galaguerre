import Deck from "#models/deck";
import type User from "#models/user";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import { MATCHMAKING_QUEUE, addMatchmakingQueueItem } from "#services/sockets/matchmaking";
import { WsRooms } from "#services/sockets/ws_rooms";
import type { HttpContext } from "@adonisjs/core/http";
import { serializeDeck } from "#controllers/decks/serialize_deck";
import { loadCardRelations } from "../../galaguerre/serialization/load_card_relations.js";
import { DeckValidationError } from "../../galaguerre/validation/validate_deck.js";
import { createGame } from "./create_game.js";

export const gameSearch = async ({ auth, response }: HttpContext) => {
    const user = auth.user!;
    const deck = await Deck.query()
        .where("userId", user.id)
        .andWhere("selected", true)
        .preload("cards", loadCardRelations)
        .first();

    if (!deck) return response.badRequest({ error: "You have no deck selected" });

    const serializedDeck = serializeDeck(deck);
    if (!serializedDeck.valid) {
        return response.badRequest({
            error: "Votre deck est invalide et ne peut pas être utilisé pour lancer une partie",
            details: serializedDeck.compositionErrors,
        });
    }

    if (MATCHMAKING_QUEUE.length === 0) {
        addMatchmakingQueueItem(user.id);
        return { message: "Waiting for an opponent to join..." };
    }

    const opponent = MATCHMAKING_QUEUE.shift()!;

    const opponentDeck = await Deck.query()
        .where("userId", opponent.userId)
        .andWhere("selected", true)
        .preload("cards", loadCardRelations)
        .preload("user")
        .firstOrFail();

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

        const swapSeats = Math.random() < 0.5;
        const playerOne = swapSeats ? humanTwo : humanOne;
        const playerTwo = swapSeats ? humanOne : humanTwo;

        game = await createGame({ playerOne, playerTwo });
    } catch (error) {
        if (error instanceof DeckValidationError) {
            return response.badRequest({
                error: "Invalid cards in deck",
                details: error.errors,
            });
        }

        throw error;
    }

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
