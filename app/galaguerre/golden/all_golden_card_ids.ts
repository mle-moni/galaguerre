import { getAllCardTemplates } from "#api_types/card_preview";

let cachedGoldenCardIds: number[] | null = null;

/**
 * Toutes les cartes qui possèdent une version dorée, jetons non collectionnables inclus.
 * Sert à l'IA Expert, qui joue intégralement en doré pour un aspect « boss de fin ».
 */
export const getAllGoldenCardIds = (): number[] => {
    cachedGoldenCardIds ??= getAllCardTemplates()
        .filter((template) => Boolean(template.goldenVideoUrl))
        .map((template) => template.cardId);

    return cachedGoldenCardIds;
};
