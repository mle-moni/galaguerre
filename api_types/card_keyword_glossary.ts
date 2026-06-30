import { CARD_TAGS, CARD_TAG_LABELS } from "../app/galaguerre/card_tags.js";

export type KeywordGlossaryEntry = {
    name: string;
    symbol: string;
    description: string;
};

export type CardFamilyGlossaryEntry = {
    symbol: string;
    label: string;
};

export const KEYWORD_GLOSSARY_ENTRIES: KeywordGlossaryEntry[] = [
    {
        name: "Provocation",
        symbol: "🔒",
        description: "Doit être attaqué en priorité par les monstres adverses.",
    },
    {
        name: "Charge",
        symbol: "💥",
        description: "Peut attaquer dès le tour où il est joué.",
    },
    {
        name: "Furie des vents",
        symbol: "🌪️",
        description: "Peut attaquer deux fois par tour.",
    },
    {
        name: "Toxique",
        symbol: "🐍",
        description: "Détruit tout monstre blessé par ce monstre.",
    },
    {
        name: "Discrétion",
        symbol: "🥷",
        description:
            "Ne peut pas être ciblé directement par l'adversaire. Perd Discrétion après avoir attaqué.",
    },
    {
        name: "Immunité",
        symbol: "🛡️",
        description: "Bloque la première source de dégâts reçue.",
    },
    {
        name: "Cri de guerre",
        symbol: "✨",
        description: "Effet déclenché à la mise en jeu du monstre.",
    },
    {
        name: "Dernier souffle",
        symbol: "💀",
        description: "Effet déclenché à la mort du monstre.",
    },
    {
        name: "Effet déclenché",
        symbol: "⚡",
        description: "Passif qui se déclenche lors d'un événement (fin de tour, pioche, etc.).",
    },
];

export const EFFECT_SYMBOLS: Record<string, string> = Object.fromEntries(
    KEYWORD_GLOSSARY_ENTRIES.map((entry) => [entry.name, entry.symbol]),
);

export const EFFECT_DESCRIPTIONS: Record<string, string> = Object.fromEntries(
    KEYWORD_GLOSSARY_ENTRIES.map((entry) => [entry.name, entry.description]),
);

export const CARD_FAMILY_GLOSSARY_ENTRIES: CardFamilyGlossaryEntry[] = CARD_TAGS.map((tag) => {
    const meta = CARD_TAG_LABELS[tag];
    return { symbol: meta.symbol, label: meta.label };
});
