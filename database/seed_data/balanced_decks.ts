export type DeckRecipeEntry = {
    label: string;
    copies: number;
};

export const DECK_SIZE = 30;

export const GALADRIM_AGGRO_DECK_RECIPE: DeckRecipeEntry[] = [
    { label: "Stagiaire Dev", copies: 2 },
    { label: "BizDev Débutant", copies: 2 },
    { label: "Parisien Pressé", copies: 2 },
    { label: "Sales Charismatique", copies: 2 },
    { label: "Closer Affamé", copies: 2 },
    { label: "Chien Foufou", copies: 2 },
    { label: "PM Stressé", copies: 2 },
    { label: "Négociateur", copies: 2 },
    { label: "Tasse à Café Ébréchée", copies: 2 },
    { label: "Clavier Mécanique", copies: 2 },
    { label: "Heures Sup'", copies: 2 },
    { label: "Goodies Galadrim", copies: 2 },
    { label: "Dev Insomniaque", copies: 2 },
    { label: "Pause Café", copies: 2 },
    { label: "Key Account Manager", copies: 1 },
    { label: "Directeur Commercial", copies: 1 },
];

export const GALADRIM_MIDRANGE_DECK_RECIPE: DeckRecipeEntry[] = [
    { label: "Agent Support", copies: 2 },
    { label: "Plante Verte", copies: 2 },
    { label: "Dev Back-End", copies: 2 },
    { label: "Happiness Manager", copies: 2 },
    { label: "Agiliste Convaincu", copies: 2 },
    { label: "Scrum Master", copies: 2 },
    { label: "Recruteur RH", copies: 2 },
    { label: "Nantais Détendu", copies: 2 },
    { label: "Parisien Bobo", copies: 2 },
    { label: "Manager Bienveillant", copies: 2 },
    { label: "Product Owner", copies: 2 },
    { label: "Pause Café", copies: 2 },
    { label: "Déploiement Réussi", copies: 2 },
    { label: "Sprint Review", copies: 2 },
    { label: "Support de Nuit", copies: 1 },
    { label: "Architecte Système", copies: 1 },
];

export const SEEDED_DECKS: { name: string; recipe: DeckRecipeEntry[]; selected: boolean }[] = [
    { name: "Deck aggro", recipe: GALADRIM_AGGRO_DECK_RECIPE, selected: true },
    { name: "Deck midrange", recipe: GALADRIM_MIDRANGE_DECK_RECIPE, selected: false },
];

export const buildDeckCardIds = (
    recipe: DeckRecipeEntry[],
    cardByLabel: Map<string, { id: number }>,
): number[] =>
    recipe.flatMap(({ label, copies }) => {
        const card = cardByLabel.get(label);
        if (!card) {
            throw new Error(`Card not found for deck recipe: ${label}`);
        }

        return Array.from({ length: copies }, () => card.id);
    });

export const recipeTotalCards = (recipe: DeckRecipeEntry[]): number =>
    recipe.reduce((sum, { copies }) => sum + copies, 0);
