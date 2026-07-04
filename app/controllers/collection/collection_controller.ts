import type { HttpContext } from "@adonisjs/core/http";
import CardPack from "#models/card_pack";
import { getUserCollectionEntries } from "#services/collection/get_user_collection_counts";
import {
    buyCardWithGoldCoins,
    CardNotBuyableError,
    NotEnoughGoldCoinsError as BuyCardNotEnoughGoldCoinsError,
} from "#services/collection/buy_card_with_gold_coins";
import {
    CardNotSellableError,
    CollectionTooSmallError,
    sellCardWithGoldCoins,
} from "#services/collection/sell_card_with_gold_coins";
import {
    NoUnopenedPackError,
    NotEnoughCollectibleCardsError,
    openCardPack,
} from "#services/collection/open_card_pack";
import {
    computeDuplicatesSellPreview,
    NoDuplicatesToSellError,
    sellAllDuplicateCards,
} from "#services/collection/sell_duplicate_cards";
import { buyCardSchema, sellCardSchema } from "./collection_validators.js";

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

            if (error instanceof NotEnoughCollectibleCardsError) {
                return response.badRequest({ error: error.message });
            }

            throw error;
        }
    }

    async duplicatesPreview({ auth }: HttpContext) {
        return await computeDuplicatesSellPreview(auth.user!.id);
    }

    async sellDuplicates({ auth, response }: HttpContext) {
        try {
            return await sellAllDuplicateCards(auth.user!.id);
        } catch (error) {
            if (error instanceof NoDuplicatesToSellError) {
                return response.badRequest({ error: error.message });
            }

            throw error;
        }
    }

    async buyCard({ auth, request, response }: HttpContext) {
        const { cardId } = await request.validateUsing(buyCardSchema);

        try {
            return await buyCardWithGoldCoins(auth.user!.id, cardId);
        } catch (error) {
            if (error instanceof BuyCardNotEnoughGoldCoinsError) {
                return response.badRequest({ error: error.message });
            }

            if (error instanceof CardNotBuyableError) {
                return response.badRequest({ error: error.message });
            }

            throw error;
        }
    }

    async sellCard({ auth, request, response }: HttpContext) {
        const { cardId } = await request.validateUsing(sellCardSchema);

        try {
            return await sellCardWithGoldCoins(auth.user!.id, cardId);
        } catch (error) {
            if (error instanceof CardNotSellableError || error instanceof CollectionTooSmallError) {
                return response.badRequest({ error: error.message });
            }

            throw error;
        }
    }
}
