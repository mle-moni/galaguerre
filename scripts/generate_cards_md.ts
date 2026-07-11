import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CARD_RARITY_LABELS } from "#api_types/card_rarity.types";
import { getAllCardTemplates } from "#api_types/card_preview";
import { CARD_LABEL_TAG_LABELS } from "#galaguerre/card_label_tags";
import { CARD_TAGS, CARD_TAG_LABELS } from "#galaguerre/card_tags";
import { GALADRIM_CARDS } from "#database/seed_data/cards/galadrim_cards";

const OUTPUT = join(dirname(fileURLToPath(import.meta.url)), "../cards.md");

export const generateCardsMd = () => {
    const rarityById = new Map(GALADRIM_CARDS.map((e) => [e.id, e.rarity ?? "COMMON"]));
    const collectibleById = new Map(GALADRIM_CARDS.map((e) => [e.id, e.isCollectible ?? true]));

    const lines: string[] = [
        "# Catalogue des cartes Galaguerre (set Galadrim)",
        "",
        "Format compact pour construction de deck par LLM.",
        "",
        "## Règles de deck",
        "",
        "- 30 cartes exactement",
        "- Max 2 exemplaires par carte (1 pour les légendaires)",
        "- Seules les cartes collectionnables peuvent être dans un deck",
        "",
        "## Mots-clés",
        "",
        "- Provocation: doit être attaqué en priorité",
        "- Charge: peut attaquer dès le tour de mise en jeu",
        "- Furie des vents: peut attaquer 2 fois par tour",
        "- Toxique: détruit les monstres blessés par ce monstre",
        "- Discrétion: non ciblable directement (perdu après attaque)",
        "- Immunité: bloque la première source de dégâts",
        "- Cri de guerre: effet à la mise en jeu",
        "- Dernier souffle: effet à la mort",
        "- Effet déclenché: passif sur événement (fin/début de tour, pioche…)",
        "",
        "## Familles (tags)",
        "",
        `- ${CARD_TAGS.map((tag) => CARD_TAG_LABELS[tag].label).join(", ")}`,
        "",
        "## Tags",
        "",
        ...Object.values(CARD_LABEL_TAG_LABELS).map(
            (entry) => `- ${entry.label} : cartes générées, visibles dans le texte de la carte`,
        ),
        "",
        "## Cartes",
        "",
    ];

    for (const card of getAllCardTemplates().sort((a, b) => a.cardId - b.cardId)) {
        const rarity = rarityById.get(card.cardId)!;
        const collectible = collectibleById.get(card.cardId)!;
        const tags = card.tags.map((t) => CARD_TAG_LABELS[t]?.label ?? t).join(", ") || "—";
        const coll = collectible ? "" : " | NON-COLLECTIONNABLE";

        let stats = "—";
        if (card.type === "MINION") {
            stats = `${card.attack}/${card.health}`;
            if (card.effects.length > 0) {
                stats += ` [${card.effects.join(", ")}]`;
            }
        } else if (card.type === "WEAPON") {
            stats = `${card.damage}/${card.durability}`;
        }

        const desc = card.description.replace(/\n/g, " | ");

        lines.push(
            `### #${card.cardId} ${card.label}`,
            `- Coût: ${card.cost} | Type: ${card.type} | Stats: ${stats} | Rareté: ${CARD_RARITY_LABELS[rarity]} | Famille: ${tags}${coll}`,
        );
        if (desc) {
            lines.push(`- ${desc}`);
        }
        lines.push("");
    }

    writeFileSync(OUTPUT, lines.join("\n"));
    return getAllCardTemplates().length;
};
