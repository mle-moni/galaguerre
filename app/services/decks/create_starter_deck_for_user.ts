import { GALADRIM_AGGRO_DECK_RECIPE } from "#database/seed_data/balanced_decks";
import type Deck from "#models/deck";
import { grantStarterCollectionForUser } from "#services/collection/grant_starter_collection_for_user";
import { createDeckFromRecipe } from "./create_deck_from_recipe.js";

export const STARTER_DECK_NAME = "Deck de départ";

export const createStarterDeckForUser = async (userId: number): Promise<Deck> => {
    await grantStarterCollectionForUser(userId);

    return createDeckFromRecipe({
        userId,
        name: STARTER_DECK_NAME,
        recipe: GALADRIM_AGGRO_DECK_RECIPE,
        selected: true,
    });
};
