import type Card from "#models/card";
import Deck from "#models/deck";
import type User from "#models/user";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import { MATCHMAKING_QUEUE, addMatchmakingQueueItem } from "#services/sockets/matchmaking";
import { WsRooms } from "#services/sockets/ws_rooms";
import type { HttpContext } from "@adonisjs/core/http";
import type { ManyToManyQueryBuilderContract } from "@adonisjs/lucid/types/relations";
import { DeckValidationError } from "../../galaguerre/validation/validate_deck.js";
import { createGame } from "./create_game.js";

const preloadActionRelations = (aq: {
    preload: (relation: string, callback?: (sq: any) => void) => void;
}) => {
    aq.preload("boost", (bq: any) => bq.preload("minionPower"));
    aq.preload("drawCardFilter", (cfq: any) => cfq.preload("comparison").preload("tags"));
    aq.preload("enemyDrawCardFilter", (cfq: any) => cfq.preload("comparison").preload("tags"));
    aq.preload("toolToTargets", (tq: any) =>
        tq.preload("target", (targetQ: any) => targetQ.preload("comparison")),
    );
};

const preloadMinionActionRelations = (q: {
    preload: (relation: string, callback?: (sq: any) => void) => void;
}) => {
    q.preload("action", preloadActionRelations);
};

const loadCardRelations = (q: ManyToManyQueryBuilderContract<typeof Card, any>) => {
    q.preload("tags")
        .preload("minion", (q) =>
            q
                .preload("minionPower")
                .preload("battlecryActions", preloadMinionActionRelations)
                .preload("deathrattleActions", preloadMinionActionRelations)
                .preload("passives", (pq) =>
                    pq.preload("passive", (passiveQ) =>
                        passiveQ
                            .preload("action", preloadActionRelations)
                            .preload("boost", (bq) =>
                                bq
                                    .preload("minionPower")
                                    .preload("toolToTargets", (tq) =>
                                        tq.preload("target", (targetQ) =>
                                            targetQ.preload("comparison"),
                                        ),
                                    ),
                            ),
                    ),
                ),
        )
        .preload("spell", (sq) => sq.preload("action", preloadActionRelations))
        .preload("weapon", (wq) => wq.preload("deathrattleActions", preloadMinionActionRelations));
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
        .preload("user")
        .firstOrFail();

    const playerOne = {
        userId: opponent.userId,
        pseudo: generatePseudo(opponentDeck.user),
        deck: opponentDeck,
    };

    const playerTwo = {
        userId: user.id,
        pseudo: generatePseudo(user),
        deck,
    };

    let game;
    try {
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
