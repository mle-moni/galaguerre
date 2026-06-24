import Card from "#models/card";
import type { HttpContext } from "@adonisjs/core/http";
import { serializeCatalogCard } from "../../galaguerre/serialization/serialize_catalog_card.js";

const parseIncludeNonCollectible = (value: unknown): boolean =>
    value === true || value === "true" || value === "1";

export const listCards = async (ctx: HttpContext) => {
    const includeNonCollectible = parseIncludeNonCollectible(
        ctx.request.input("includeNonCollectible"),
    );

    const query = Card.query()
        .orderByRaw("(data->>'cost')::int asc")
        .orderByRaw("data->>'name' asc");

    if (!includeNonCollectible) {
        query.where("isCollectible", true);
    }

    const cards = await query;
    return cards.map(serializeCatalogCard);
};
