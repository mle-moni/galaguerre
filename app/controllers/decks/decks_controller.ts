import type { UpdateDeckPayload } from "#api_types/deck.types";
import Deck from "#models/deck";
import Game from "#models/game";
import type { HttpContext } from "@adonisjs/core/http";
import { validateDeckOwnership } from "#services/collection/validate_deck_ownership";
import { validateDeckCompositionForSave } from "../../galaguerre/validation/validate_deck_composition.js";
import { updateDeckMessagesProvider, updateDeckSchema } from "./deck_validators.js";
import { serializeDeck } from "./serialize_deck.js";
import {
    findUserDeck,
    preloadDeckCardSet,
    preloadDeckCards,
    syncDeckCards,
    validateDeckCardEntries,
} from "./deck_utils.js";

export default class DecksController {
    async index({ auth }: HttpContext) {
        const decks = await Deck.query()
            .where("userId", auth.user!.id)
            .preload("cards", preloadDeckCardSet)
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

        await deck.load("cards", preloadDeckCardSet);

        return serializeDeck(deck);
    }

    async update({ auth, params, request, response }: HttpContext) {
        const deck = await findUserDeck(auth.user!.id, Number(params.id));

        if (!deck) return response.notFound({ error: "Deck introuvable" });

        const payload = (await request.validateUsing(updateDeckSchema, {
            messagesProvider: updateDeckMessagesProvider,
        })) as UpdateDeckPayload;

        const cardEntries = await validateDeckCardEntries(payload.cards);
        if (!cardEntries.valid) {
            return response.badRequest({
                error: "Une ou plusieurs cartes sont invalides",
                details: cardEntries.errors,
            });
        }

        const composition = validateDeckCompositionForSave(
            payload.cards,
            cardEntries.rarityByCardId,
        );
        if (!composition.valid) {
            return response.badRequest({
                error: "Composition de deck invalide",
                details: composition.errors,
            });
        }

        const ownership = await validateDeckOwnership(auth.user!.id, payload.cards);
        if (!ownership.valid) {
            return response.badRequest({
                error: "Vous ne possédez pas toutes les cartes de ce deck",
                details: ownership.errors,
            });
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

        const serialized = serializeDeck(deck);
        if (!serialized.valid) {
            return response.badRequest({
                error: "Ce deck est invalide et ne peut pas être sélectionné",
                details: serialized.compositionErrors,
            });
        }

        await Deck.query().where("userId", auth.user!.id).update({ selected: false });

        deck.selected = true;
        await deck.save();

        return serializeDeck(deck);
    }
}
