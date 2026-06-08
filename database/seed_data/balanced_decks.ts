export type DeckRecipeEntry = {
    label: string;
    copies: number;
};

export const DECK_SIZE = 30;

export const AGGRO_DECK_RECIPE: DeckRecipeEntry[] = [
    { label: "Lutin", copies: 2 },
    { label: "Lance-tonneau", copies: 2 },
    { label: "Sergent abusif", copies: 2 },
    { label: "Porte-bouclier", copies: 2 },
    { label: "Warglaive d'Azzinoth", copies: 1 },
    { label: "Gnome lépreux", copies: 2 },
    { label: "Sanglier", copies: 2 },
    { label: "Espion luminescent", copies: 1 },
    { label: "Mousquetaire de Forgefer", copies: 2 },
    { label: "Commandant argenté", copies: 2 },
    { label: "Chef de guerre murloc", copies: 2 },
    { label: "Voyant luminescent", copies: 2 },
    { label: "Chevalier de Hurlevent", copies: 2 },
    { label: "Corsaire redoutable", copies: 2 },
    { label: "Leeroy Jenkins", copies: 1 },
    { label: "Jeune faucon-dragon", copies: 2 },
    { label: "Dragon mécanique", copies: 1 },
];

export const MIDRANGE_DECK_RECIPE: DeckRecipeEntry[] = [
    { label: "Porte-bouclier", copies: 2 },
    { label: "Gardien de la Lumière", copies: 2 },
    { label: "Spectre apaisant", copies: 2 },
    { label: "Glaneur de butin", copies: 2 },
    { label: "Guérisseur de terrain", copies: 2 },
    { label: "Mage de sang Thalnos", copies: 2 },
    { label: "Maître-naturaliste", copies: 2 },
    { label: "Piétinement", copies: 2 },
    { label: "Moine du Shado-Pan", copies: 2 },
    { label: "Farseer du Cercle terrestre", copies: 2 },
    { label: "Capitaine des mers du Sud", copies: 2 },
    { label: "Héritage de l'Empereur", copies: 2 },
    { label: "Défenseur d'Argus", copies: 1 },
    { label: "Drake du Crépuscule", copies: 1 },
    { label: "Guerrier tauren", copies: 1 },
    { label: "Rampant des fondrières", copies: 1 },
    { label: "Abomination", copies: 1 },
    { label: "Prêtresse d'Elune", copies: 1 },
];

export const BALANCED_DECKS_BY_EMAIL: Record<string, { name: string; recipe: DeckRecipeEntry[] }> =
    {
        "test@test.fr": { name: "Deck aggro", recipe: AGGRO_DECK_RECIPE },
        "admin@admin.fr": { name: "Deck midrange", recipe: MIDRANGE_DECK_RECIPE },
    };

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
