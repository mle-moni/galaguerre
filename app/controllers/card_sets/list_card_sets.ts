import CardSet from "#models/card_set";
import type { HttpContext } from "@adonisjs/core/http";

export const listActiveCardSets = async (_ctx: HttpContext) => {
    const cardSets = await CardSet.query()
        .where("isActive", true)
        .orderBy("name", "asc")
        .select("id", "name");

    return cardSets.map((cardSet) => ({
        id: cardSet.id,
        name: cardSet.name,
    }));
};
