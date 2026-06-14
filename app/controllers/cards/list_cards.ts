import Card from "#models/card";
import type { HttpContext } from "@adonisjs/core/http";
import { serializeCatalogCard } from "../../galaguerre/serialization/serialize_catalog_card.js";

export const listCards = async (_ctx: HttpContext) => {
    const cards = await Card.query()
        .where("isCollectible", true)
        .orderByRaw("(data->>'cost')::int asc")
        .orderByRaw("data->>'name' asc");
    return cards.map(serializeCatalogCard);
};
