export type DeckRecipeEntry = {
    label: string;
    copies: number;
    cardId: number;
};

export const DECK_SIZE = 30;

export const GALADRIM_AGGRO_DECK_RECIPE: DeckRecipeEntry[] = [
    { label: "Stagiaire Dev", copies: 2, cardId: 62 },
    { label: "BizDev Débutant", copies: 2, cardId: 76 },
    { label: "Parisien Pressé", copies: 2, cardId: 87 },
    { label: "Sales Charismatique", copies: 2, cardId: 77 },
    { label: "Closer Affamé", copies: 2, cardId: 78 },
    { label: "Chien Foufou", copies: 2, cardId: 94 },
    { label: "PM Stressé", copies: 2, cardId: 72 },
    { label: "Négociateur", copies: 2, cardId: 79 },
    { label: "Tasse à Café Ébréchée", copies: 2, cardId: 106 },
    { label: "Clavier Mécanique", copies: 2, cardId: 107 },
    { label: "Heures Sup'", copies: 2, cardId: 101 },
    { label: "Lendemain de soirée", copies: 2, cardId: 109 },
    { label: "Dev Insomniaque", copies: 2, cardId: 68 },
    { label: "Pause Café", copies: 2, cardId: 96 },
    { label: "Key Account Manager", copies: 2, cardId: 80 },
];

export const GALADRIM_MIDRANGE_DECK_RECIPE: DeckRecipeEntry[] = [
    { label: "Agent Support", copies: 2, cardId: 82 },
    { label: "Plante Verte", copies: 2, cardId: 95 },
    { label: "Dev Back-End", copies: 2, cardId: 64 },
    { label: "Happiness Manager", copies: 2, cardId: 83 },
    { label: "Agiliste Convaincu", copies: 2, cardId: 75 },
    { label: "Scrum Master", copies: 2, cardId: 71 },
    { label: "Recruteur RH", copies: 2, cardId: 84 },
    { label: "Nantais Détendu", copies: 2, cardId: 89 },
    { label: "Bobo Parisien", copies: 2, cardId: 88 },
    { label: "Manager Bienveillant", copies: 2, cardId: 85 },
    { label: "Product Owner", copies: 2, cardId: 73 },
    { label: "Pause Café", copies: 2, cardId: 96 },
    { label: "Déploiement Réussi", copies: 2, cardId: 98 },
    { label: "Sprint Review", copies: 2, cardId: 100 },
    { label: "Support de Nuit", copies: 1, cardId: 86 },
    { label: "Architecte Système", copies: 1, cardId: 69 },
];

export const SEEDED_DECKS: { name: string; recipe: DeckRecipeEntry[]; selected: boolean }[] = [
    { name: "Deck aggro", recipe: GALADRIM_AGGRO_DECK_RECIPE, selected: true },
    // { name: "Deck midrange", recipe: GALADRIM_MIDRANGE_DECK_RECIPE, selected: false },
];

export const buildDeckCardIds = (recipe: DeckRecipeEntry[]): number[] =>
    recipe.flatMap(({ cardId, copies }) => Array.from({ length: copies }, () => cardId));

export const recipeTotalCards = (recipe: DeckRecipeEntry[]): number =>
    recipe.reduce((sum, { copies }) => sum + copies, 0);
