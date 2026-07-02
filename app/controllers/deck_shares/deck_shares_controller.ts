import type { ImportDeckPayload } from "#api_types/deck_share.types";
import DeckShare from "#models/deck_share";
import { createDeckShare } from "#services/decks/create_deck_share";
import { DeckShareImportError, importDeckFromShare } from "#services/decks/import_deck_from_share";
import type { HttpContext } from "@adonisjs/core/http";
import vine, { SimpleMessagesProvider } from "@vinejs/vine";
import { DEFAULT_MESSAGE_PROVIDER_CONFIG } from "#adomin/validation/default_validator";
import { serializeDeckShare } from "./serialize_deck_share.js";

const importDeckSchema = vine.compile(
    vine.object({
        shareCode: vine.string().trim().minLength(1).maxLength(12),
    }),
);

const messagesProvider = new SimpleMessagesProvider(DEFAULT_MESSAGE_PROVIDER_CONFIG, {
    shareCode: "code de partage",
});

export default class DeckSharesController {
    async show({ params, response }: HttpContext) {
        const share = await DeckShare.query().where("code", params.code).preload("user").first();

        if (!share) {
            return response.notFound({ error: "Deck partagé introuvable" });
        }

        return serializeDeckShare(share);
    }

    async store({ auth, params, response }: HttpContext) {
        try {
            const share = await createDeckShare({
                userId: auth.user!.id,
                deckId: Number(params.deckId),
            });

            await share.load("user");

            return {
                code: share.code,
                url: `/decks/s/${share.code}`,
            };
        } catch (error) {
            if (error instanceof Error && error.message === "DECK_NOT_FOUND") {
                return response.notFound({ error: "Deck introuvable" });
            }

            throw error;
        }
    }

    async import({ auth, request, response }: HttpContext) {
        const payload = (await request.validateUsing(importDeckSchema, {
            messagesProvider,
        })) as ImportDeckPayload;

        try {
            return await importDeckFromShare({
                userId: auth.user!.id,
                shareCode: payload.shareCode,
            });
        } catch (error) {
            if (!(error instanceof DeckShareImportError)) {
                throw error;
            }

            if (error.code === "SHARE_NOT_FOUND") {
                return response.notFound({ error: "Deck partagé introuvable" });
            }

            if (error.code === "INVALID_SHARED_DECK") {
                return response.badRequest({
                    error: "Ce deck partagé n'est pas valide",
                    details: error.details,
                });
            }

            if (error.code === "MISSING_CARDS") {
                return response.badRequest({
                    error: "Vous ne possédez aucune carte de ce deck",
                    details: error.details,
                });
            }

            throw error;
        }
    }
}
