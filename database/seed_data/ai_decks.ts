import type { AiDeckProfile } from "#api_types/game.types";
import type { DeckRecipeEntry } from "./balanced_decks.js";

/**
 * Decks joués par l'IA « Avancé ». Elle en tire un au hasard au début de chaque partie.
 *
 * L'IA « Débutant » garde son deck historique (`TRAINING_BOT_DECK_RECIPE`) : le tutoriel
 * d'onboarding dépend de sa main de départ exacte.
 */

/** Aggro tribal Pets : courbe très basse, synergies de famille, pression sur le héros adverse. */
export const AI_AGGRO_PETS_DECK_RECIPE: DeckRecipeEntry[] = [
    { label: "Koda", copies: 2, cardId: 157 },
    { label: "Sully JR", copies: 2, cardId: 92 },
    { label: "BizDev Débutant", copies: 2, cardId: 76 },
    { label: "Casque à Réduction de Bruit", copies: 1, cardId: 110 },
    { label: "Lendemain de soirée", copies: 1, cardId: 109 },
    { label: "Chat sur le Clavier", copies: 2, cardId: 93 },
    { label: "Princesse", copies: 1, cardId: 162 },
    { label: "Papuche", copies: 2, cardId: 156 },
    { label: "Commère de l'Open Space", copies: 2, cardId: 115 },
    { label: "Aloy", copies: 2, cardId: 158 },
    { label: "Chien Foufou", copies: 2, cardId: 94 },
    { label: "Zoothérapie", copies: 2, cardId: 153 },
    { label: "Distributeur de Croquettes", copies: 2, cardId: 118 },
    { label: "Neva", copies: 2, cardId: 154 },
    { label: "OG Sully", copies: 1, cardId: 159 },
    { label: "Product Owner", copies: 1, cardId: 73 },
    { label: "Key Account Manager", copies: 1, cardId: 80 },
    { label: "Câble Réseau", copies: 1, cardId: 108 },
    { label: "Head of Emojis", copies: 1, cardId: 169 },
];

/** Mid-range : contrôle du plateau, armes, retraits ciblés et gros finisseurs. */
export const AI_MIDRANGE_DECK_RECIPE: DeckRecipeEntry[] = [
    { label: "Mentor Technique", copies: 2, cardId: 150 },
    { label: "Gros Cahier des Charges", copies: 2, cardId: 171 },
    { label: "Dev Front-End", copies: 2, cardId: 63 },
    { label: "Copier-Coller", copies: 2, cardId: 163 },
    { label: "Dev Aigri", copies: 2, cardId: 65 },
    { label: "Scrum Master", copies: 2, cardId: 71 },
    { label: "Clavier Mécanique", copies: 2, cardId: 107 },
    { label: "Alexis", copies: 2, cardId: 180 },
    { label: "Jean", copies: 1, cardId: 177 },
    { label: "Product Owner", copies: 2, cardId: 73 },
    { label: "Sprint Review", copies: 1, cardId: 100 },
    { label: "Buddy Charismatique", copies: 2, cardId: 182 },
    { label: "Réunion Interminable", copies: 2, cardId: 99 },
    { label: "Câble Réseau", copies: 2, cardId: 108 },
    { label: "Molly", copies: 1, cardId: 176 },
    { label: "Architecte Système", copies: 2, cardId: 69 },
    { label: "Mise en prod du vendredi", copies: 1, cardId: 179 },
];

export interface AiDeckDefinition {
    profile: AiDeckProfile;
    name: string;
    recipe: DeckRecipeEntry[];
}

export const ADVANCED_AI_DECKS: AiDeckDefinition[] = [
    { profile: "AGGRO", name: "Aggro pets", recipe: AI_AGGRO_PETS_DECK_RECIPE },
    { profile: "MIDRANGE", name: "Mid-range", recipe: AI_MIDRANGE_DECK_RECIPE },
];

/** Au-delà de ce coût moyen, un deck est considéré comme lent. */
const SLOW_DECK_AVERAGE_COST = 3.2;

/**
 * Contre-pick du deck de l'IA « Expert ». Elle voit le deck du joueur avant la partie, autant
 * qu'elle s'en serve : face à une liste lente on prend l'aggro, qui gagne avant que l'autre ne
 * déroule ; face à une liste rapide on prend le mid-range, ses murs et ses retraits.
 *
 * L'IA « Avancé » continue de tirer son deck au hasard.
 */
export const pickAiDeckAgainstCosts = (opponentCardCosts: readonly number[]): AiDeckDefinition => {
    const byProfile = (profile: AiDeckProfile): AiDeckDefinition =>
        ADVANCED_AI_DECKS.find((deck) => deck.profile === profile) ?? ADVANCED_AI_DECKS[0]!;

    if (opponentCardCosts.length === 0) return byProfile("MIDRANGE");

    const averageCost =
        opponentCardCosts.reduce((total, cost) => total + cost, 0) / opponentCardCosts.length;

    return averageCost >= SLOW_DECK_AVERAGE_COST ? byProfile("AGGRO") : byProfile("MIDRANGE");
};
