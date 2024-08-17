import type Card from "#models/card";
import Deck from "#models/deck";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import { MATCHMAKING_QUEUE, addMatchmakingQueueItem } from "#services/sockets/matchmaking";
import { WsRooms } from "#services/sockets/ws_rooms";
import type { HttpContext } from "@adonisjs/core/http";
import type { ManyToManyQueryBuilderContract } from "@adonisjs/lucid/types/relations";
import { createGame } from "./create_game.js";

const loadCardRelations = (q: ManyToManyQueryBuilderContract<typeof Card, any>) => {
    q.preload("minion", (q) => q.preload("minionPower"));
};

export const gameSearch = async ({ auth, response }: HttpContext) => {
    const user = auth.user!;
    const deck = await Deck.query()
        .where("userId", user.id)
        .andWhere("selected", true)
        .preload("cards", loadCardRelations)
        .first();

    if (!deck) return response.badRequest({ error: "You have no deck selected" });

    if (MATCHMAKING_QUEUE.length === 0) {
        addMatchmakingQueueItem(user.id);
        return { message: "Waiting for an opponent to join..." };
    }

    const opponent = MATCHMAKING_QUEUE.shift()!;

    const opponentDeck = await Deck.query()
        .where("userId", opponent.userId)
        .andWhere("selected", true)
        .preload("cards", loadCardRelations)
        .firstOrFail();

    const playerOne = {
        userId: opponent.userId,
        deck: opponentDeck,
    };

    const playerTwo = {
        userId: user.id,
        deck,
    };

    const game = await createGame({ playerOne, playerTwo });

    const rooms = [
        WsRooms.personalSocketRoom(opponent.userId),
        WsRooms.personalSocketRoom(user.id),
    ];

    emitSocketEvent("game:created", { gameId: game.id }, rooms);

    return { message: "Game created", game };
};
