import type { ApiCatalogCard } from "#api_types/deck.types";
import Card from "#models/card";
import type { HttpContext } from "@adonisjs/core/http";
import vine from "@vinejs/vine";
import { serializeCatalogCard } from "../../galaguerre/serialization/serialize_catalog_card.js";

export const listCardsValidator = vine.create({
    includeNonCollectible: vine.boolean().optional(),
});

export const listCards = async (
    _ctx: HttpContext,
    includeNonCollectible = false,
): Promise<ApiCatalogCard[]> => {
    const query = Card.query()
        .orderByRaw("(data->>'cost')::int asc")
        .orderByRaw("data->>'name' asc");

    if (!includeNonCollectible) {
        query.where("isCollectible", true);
    }

    const cards = await query;
    return cards.map(serializeCatalogCard);
};
