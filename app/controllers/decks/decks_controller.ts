import type { UpdateDeckPayload } from "#api_types/deck.types";
import Deck from "#models/deck";
import Game from "#models/game";
import type { HttpContext } from "@adonisjs/core/http";
import vine, { SimpleMessagesProvider } from "@vinejs/vine";
import { DEFAULT_MESSAGE_PROVIDER_CONFIG } from "#adomin/validation/default_validator";
import { loadCardRelations } from "../../galaguerre/serialization/load_card_relations.js";
import { validateDeckComposition } from "../../galaguerre/validation/validate_deck_composition.js";
import { serializeDeck } from "./serialize_deck.js";
import {
    findUserDeck,
    preloadDeckCards,
    syncDeckCards,
    validateCardIdsExist,
} from "./deck_utils.js";

const deckCardEntrySchema = vine.object({
    cardId: vine.number(),
    count: vine.number().min(1).max(2),
});

const updateDeckSchema = vine.compile(
    vine.object({
        name: vine.string().trim().minLength(1).maxLength(50),
        cards: vine.array(deckCardEntrySchema),
    }),
);

const messagesProvider = new SimpleMessagesProvider(DEFAULT_MESSAGE_PROVIDER_CONFIG, {
    name: "nom",
});

export default class DecksController {
    async index({ auth }: HttpContext) {
        const decks = await Deck.query()
            .where("userId", auth.user!.id)
            .preload("cards", loadCardRelations)
            .orderBy("createdAt", "asc");

        return decks.map(serializeDeck);
    }

    async show({ auth, params, response }: HttpContext) {
        const deck = await findUserDeck(auth.user!.id, Number(params.id));

        if (!deck) return response.notFound({ error: "Deck introuvable" });

        return serializeDeck(deck);
    }

    async store({ auth }: HttpContext) {
        const userId = auth.user!.id;
        const existingCount = await Deck.query().where("userId", userId).count("* as total");
        const isFirstDeck = Number(existingCount[0].$extras.total) === 0;

        const deck = await Deck.create({
            name: "Nouveau deck",
            userId,
            selected: isFirstDeck,
        });

        await deck.load("cards", (q) => loadCardRelations(q));

        return serializeDeck(deck);
    }

    async update({ auth, params, request, response }: HttpContext) {
        const deck = await findUserDeck(auth.user!.id, Number(params.id));

        if (!deck) return response.notFound({ error: "Deck introuvable" });

        const payload = (await request.validateUsing(updateDeckSchema, {
            messagesProvider,
        })) as UpdateDeckPayload;

        const composition = validateDeckComposition(payload.cards);
        if (!composition.valid) {
            return response.badRequest({
                error: "Composition de deck invalide",
                details: composition.errors,
            });
        }

        const cardsExist = await validateCardIdsExist(payload.cards);
        if (!cardsExist) {
            return response.badRequest({ error: "Une ou plusieurs cartes sont introuvables" });
        }

        deck.name = payload.name;
        await deck.save();
        await syncDeckCards(deck.id, payload.cards);
        await preloadDeckCards(deck);

        return serializeDeck(deck);
    }

    async destroy({ auth, params, response }: HttpContext) {
        const userId = auth.user!.id;
        const deck = await findUserDeck(userId, Number(params.id));

        if (!deck) return response.notFound({ error: "Deck introuvable" });

        const deckCount = await Deck.query().where("userId", userId).count("* as total");
        if (Number(deckCount[0].$extras.total) <= 1) {
            return response.badRequest({ error: "Impossible de supprimer votre seul deck" });
        }

        const currentGame = await Game.query()
            .where((q) => q.where("playerOneId", userId).orWhere("playerTwoId", userId))
            .andWhere("isFinished", false)
            .first();

        if (currentGame) {
            return response.badRequest({
                error: "Impossible de supprimer un deck pendant une partie en cours",
            });
        }

        const wasSelected = deck.selected;
        await deck.delete();

        if (wasSelected) {
            const nextDeck = await Deck.query()
                .where("userId", userId)
                .orderBy("createdAt", "asc")
                .first();

            if (nextDeck) {
                nextDeck.selected = true;
                await nextDeck.save();
            }
        }

        return { message: "Deck supprimé" };
    }

    async select({ auth, params, response }: HttpContext) {
        const deck = await findUserDeck(auth.user!.id, Number(params.id));

        if (!deck) return response.notFound({ error: "Deck introuvable" });

        await Deck.query().where("userId", auth.user!.id).update({ selected: false });

        deck.selected = true;
        await deck.save();

        return serializeDeck(deck);
    }
}
