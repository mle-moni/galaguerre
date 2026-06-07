import Card from "#models/card";
import type { HttpContext } from "@adonisjs/core/http";
import { preloadCardForSerialization } from "../../galaguerre/serialization/preload_card.js";
import { serializeCatalogCard } from "../../galaguerre/serialization/serialize_catalog_card.js";

export const listCards = async (_ctx: HttpContext) => {
    const cards = await Card.query().orderBy("cost", "asc").orderBy("label", "asc");

    for (const card of cards) {
        await preloadCardForSerialization(card);
    }

    return cards.map(serializeCatalogCard);
};
