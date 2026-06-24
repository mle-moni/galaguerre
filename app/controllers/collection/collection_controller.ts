import type { HttpContext } from "@adonisjs/core/http";
import CardPack from "#models/card_pack";
import { getUserCollectionEntries } from "#services/collection/get_user_collection_counts";
import {
    NoUnopenedPackError,
    NotEnoughEligibleCardsError,
    openCardPack,
} from "#services/collection/open_card_pack";

export default class CollectionController {
    async index({ auth }: HttpContext) {
        const entries = await getUserCollectionEntries(auth.user!.id);
        return { entries };
    }

    async packs({ auth }: HttpContext) {
        const result = await CardPack.query()
            .where("userId", auth.user!.id)
            .whereNull("openedAt")
            .count("* as total");

        return { unopenedCount: Number(result[0].$extras.total) };
    }

    async openPack({ auth, response }: HttpContext) {
        try {
            const cards = await openCardPack(auth.user!.id);
            return { cards };
        } catch (error) {
            if (error instanceof NoUnopenedPackError) {
                return response.badRequest({ error: error.message });
            }

            if (error instanceof NotEnoughEligibleCardsError) {
                return response.badRequest({ error: error.message });
            }

            throw error;
        }
    }
}
