/**
 * Valide database/seed_data/classic_card_hs_ids.ts
 * et vérifie que chaque URL CDN hearthstonejson répond.
 *
 * Usage: yarn generate:card-images
 *        yarn generate:card-images --write  (réécrit le fichier depuis MANUAL_OVERRIDES)
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HS_JSON_URL = "https://api.hearthstonejson.com/v1/latest/frFR/cards.json";
const HS_ART_BASE = "https://art.hearthstonejson.com/v1/render/latest/frFR/256x";
const CLASSIC_SETS = new Set(["EXPERT1", "CORE", "LEGACY", "VANILLA"]);
const OUTPUT_PATH = join(
    dirname(fileURLToPath(import.meta.url)),
    "../database/seed_data/classic_card_hs_ids.ts",
);

/** Labels exacts utilisés dans les seeders (61 cartes). */
export const SEEDED_CARD_LABELS = [
    "Lutin",
    "Éclaireur pandaren",
    "Sanglier",
    "Porte-bouclier",
    "Jeune faucon-dragon",
    "Dragon mécanique",
    "Moine du Shado-Pan",
    "Cobra empereur",
    "Patriarche dos-argenté",
    "Guerrier tauren",
    "Farseer de Thrallmar",
    "Maître brasseur",
    "Chevalier de Hurlevent",
    "Corsaire redoutable",
    "Dimetrodon",
    "Leeroy Jenkins",
    "Rampant des fondrières",
    "Commandant argenté",
    "Harpie furie des vents",
    "Seigneur de l'Arène",
    "Géant des mers",
    "Oracle luminescent",
    "Mousquetaire de Forgefer",
    "Farseer du Cercle terrestre",
    "Prêtresse d'Elune",
    "Chasseur de gros gibier",
    "Tueur de kodo",
    "Chasseur de bêtes",
    "Guérisseur de terrain",
    "Tireur d'élite",
    "Tireur de précision",
    "Exécuteur de Quel'Thalas",
    "Voyant luminescent",
    "Défenseur d'Argus",
    "Nain de Sombrefer",
    "Mage ancien",
    "Sergent abusif",
    "Drake du Crépuscule",
    "Maître-naturaliste",
    "Espion luminescent",
    "Tigre de Strangleronce",
    "Gnome lépreux",
    "Glaneur de butin",
    "Abomination",
    "Mage de sang Thalnos",
    "Spectre apaisant",
    "Lance-tonneau",
    "Piétinement",
    "Hogger Frappe !",
    "Héritage de l'Empereur",
    "Salve ardente",
    "Warglaive d'Azzinoth",
    "Doubles warglaives",
    "Baron Geddon",
    "Ragnaros le Seigneur du Feu",
    "Gardien de la Lumière",
    "Démolisseur",
    "Commissaire-priseur de Gadgetzan",
    "Chef de guerre murloc",
    "Capitaine des mers du Sud",
    "Malygos",
] as const;

/**
 * Mapping complet label → ID HS.
 * Les noms français seedés ne correspondent pas toujours exactement à l'API frFR.
 */
export const MANUAL_OVERRIDES: Record<string, string> = {
    Abomination: "EX1_097",
    "Baron Geddon": "EX1_249",
    "Capitaine des mers du Sud": "NEW1_027",
    "Chasseur de bêtes": "EX1_531",
    "Chasseur de gros gibier": "EX1_005",
    "Chevalier de Hurlevent": "CS2_131",
    "Chef de guerre murloc": "EX1_507",
    "Cobra empereur": "EX1_170",
    "Commandant argenté": "EX1_067",
    "Commissaire-priseur de Gadgetzan": "EX1_095",
    "Corsaire redoutable": "NEW1_022",
    "Défenseur d'Argus": "EX1_093",
    Démolisseur: "EX1_102",
    Dimetrodon: "EX1_tk29",
    "Doubles warglaives": "TU4e_007",
    "Drake du Crépuscule": "EX1_043",
    "Dragon mécanique": "BOT_066t",
    "Espion luminescent": "EX1_508",
    "Exécuteur de Quel'Thalas": "EX1_020",
    "Farseer de Thrallmar": "EX1_021",
    "Farseer du Cercle terrestre": "CS2_117",
    "Gardien de la Lumière": "EX1_001",
    "Géant des mers": "EX1_586",
    "Glaneur de butin": "EX1_096",
    "Gnome lépreux": "EX1_029",
    "Guerrier tauren": "EX1_390",
    "Guérisseur de terrain": "CS2_117",
    "Harpie furie des vents": "EX1_033",
    "Héritage de l'Empereur": "EX1_160",
    "Hogger Frappe !": "NEW1_040",
    "Jeune faucon-dragon": "CS2_169",
    "Lance-tonneau": "TU4c_002",
    "Leeroy Jenkins": "EX1_116",
    Lutin: "CS2_231",
    "Maître brasseur": "TU4f_005",
    "Maître-naturaliste": "EX1_534",
    "Mage ancien": "EX1_584",
    "Mage de sang Thalnos": "EX1_012",
    Malygos: "EX1_563",
    "Moine du Shado-Pan": "TU4f_003",
    "Mousquetaire de Forgefer": "CS2_141",
    "Nain de Sombrefer": "EX1_046",
    "Oracle luminescent": "EX1_050",
    "Patriarche dos-argenté": "CS2_127",
    Piétinement: "TU4c_004",
    "Porte-bouclier": "EX1_405",
    "Prêtresse d'Elune": "EX1_583",
    "Ragnaros le Seigneur du Feu": "EX1_298",
    "Rampant des fondrières": "CS1_069",
    "Salve ardente": "EX1_277",
    Sanglier: "CS2_boar",
    "Seigneur de l'Arène": "CS2_162",
    "Sergent abusif": "CS2_188",
    "Spectre apaisant": "EX1_011",
    "Tigre de Strangleronce": "EX1_028",
    "Tireur d'élite": "CS2_141",
    "Tireur de précision": "EX1_609",
    "Tueur de kodo": "NEW1_041",
    "Voyant luminescent": "EX1_103",
    "Warglaive d'Azzinoth": "BT_430",
    "Éclaireur pandaren": "TU4f_002",
};

type HearthstoneCard = {
    id: string;
    name: string;
    set: string;
};

const fetchClassicCards = async (): Promise<HearthstoneCard[]> => {
    const response = await fetch(HS_JSON_URL);
    if (!response.ok) {
        throw new Error(`Échec du téléchargement JSON: ${response.status} ${response.statusText}`);
    }
    const data = (await response.json()) as HearthstoneCard[];
    return data.filter((card) => CLASSIC_SETS.has(card.set));
};

const buildNameIndex = (cards: HearthstoneCard[]): Map<string, string> => {
    const index = new Map<string, string>();
    for (const card of cards) {
        if (!index.has(card.name)) {
            index.set(card.name, card.id);
        }
    }
    return index;
};

const resolveMapping = (
    nameIndex: Map<string, string>,
): { mapping: Record<string, string>; unresolved: string[] } => {
    const mapping: Record<string, string> = {};
    const unresolved: string[] = [];

    for (const label of SEEDED_CARD_LABELS) {
        const manualId = MANUAL_OVERRIDES[label];
        if (manualId) {
            mapping[label] = manualId;
            continue;
        }

        const apiId = nameIndex.get(label);
        if (apiId) {
            mapping[label] = apiId;
        } else {
            unresolved.push(label);
        }
    }

    return { mapping, unresolved };
};

const validateImageUrls = async (mapping: Record<string, string>): Promise<string[]> => {
    const failures: string[] = [];

    await Promise.all(
        Object.entries(mapping).map(async ([label, cardId]) => {
            const url = `${HS_ART_BASE}/${cardId}.png`;
            const response = await fetch(url, { method: "HEAD" });
            if (!response.ok) {
                failures.push(`${label} (${cardId}): HTTP ${response.status}`);
            }
        }),
    );

    return failures;
};

const formatMappingFile = (mapping: Record<string, string>): string => {
    const entries = Object.entries(mapping)
        .sort(([a], [b]) => a.localeCompare(b, "fr"))
        .map(([label, id]) => `    "${label.replace(/"/g, '\\"')}": "${id}",`)
        .join("\n");

    return `/**
 * Mapping label seedé → ID carte Hearthstone.
 * Généré / validé par scripts/generate_hs_card_ids.ts
 */
export const CARD_HS_IDS: Record<string, string> = {
${entries}
};
`;
};

const main = async () => {
    const shouldWrite = process.argv.includes("--write");

    console.log("Téléchargement des données JSON frFR...");
    const classicCards = await fetchClassicCards();
    console.log(`${classicCards.length} cartes Classic/CORE/LEGACY/VANILLA trouvées.`);

    const nameIndex = buildNameIndex(classicCards);
    const { mapping, unresolved } = resolveMapping(nameIndex);

    if (unresolved.length > 0) {
        console.error("\nLabels non résolus (ajouter dans MANUAL_OVERRIDES):");
        for (const label of unresolved) {
            console.error(`  - ${label}`);
        }
        process.exit(1);
    }

    console.log(`\n${Object.keys(mapping).length}/${SEEDED_CARD_LABELS.length} labels résolus.`);

    console.log("Validation des URLs CDN...");
    const failures = await validateImageUrls(mapping);
    if (failures.length > 0) {
        console.error("\nURLs CDN invalides:");
        for (const failure of failures) {
            console.error(`  - ${failure}`);
        }
        process.exit(1);
    }
    console.log("Toutes les URLs CDN sont valides.");

    if (shouldWrite) {
        writeFileSync(OUTPUT_PATH, formatMappingFile(mapping), "utf8");
        console.log(`\nFichier écrit: ${OUTPUT_PATH}`);
    } else {
        console.log("\nUtilisez --write pour réécrire classic_card_hs_ids.ts");
    }
};

const isMainModule = import.meta.url === pathToFileURL(process.argv[1] ?? "").href;

if (isMainModule) {
    main().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
