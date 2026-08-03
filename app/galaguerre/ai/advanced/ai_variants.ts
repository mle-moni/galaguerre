import { AI_DIFFICULTIES, type AiDifficulty } from "#api_types/game.types";
import { ADVANCED_AI_DEFAULTS } from "./advanced_ai_config.js";
import { EXPERT_AI_DEFAULTS, type ExpertAiConfig } from "./expert_ai_config.js";

/**
 * Registre des VARIANTES d'IA opposables au banc d'essai (`dev:bench-ai`).
 *
 * Une variante, c'est une difficulté plus un jeu de réglages nommé. Sans elle, le banc ne sait
 * comparer que des difficultés — donc jamais deux versions de l'Expert entre elles, qui est
 * pourtant la seule mesure capable de dire si une évolution vaut quelque chose.
 *
 * La discipline à tenir : chaque idée devient une variante nommée qui ne change QU'UNE chose par
 * rapport à `expert`. On mesure `expert` contre elle ; si le SPRT accepte, la valeur passe dans
 * `EXPERT_AI_DEFAULTS` et la variante disparaît. Un changement groupé de trois paramètres se
 * mesure comme un seul verdict, et on ne saura jamais lequel des trois portait le gain.
 *
 * Pour un balayage ponctuel, inutile d'ajouter une entrée ici : le banc accepte des surcharges
 * en ligne (`--left-set=replyCandidates=8,replyBeamWidth=5`).
 */

export interface AiVariantDefinition {
    difficulty: AiDifficulty;
    /** Ce que cette variante change par rapport à `expert` / `advanced`, en une phrase. */
    description: string;
    /** Surcharges appliquées aux réglages par défaut de la difficulté. */
    config?: Partial<ExpertAiConfig>;
}

export const AI_VARIANTS = {
    beginner: {
        difficulty: "BEGINNER",
        description: "Premier coup légal, sans recherche : l'étalon bas du classement",
    },
    advanced: {
        difficulty: "ADVANCED",
        description: "Recherche en faisceau sans pli de riposte, réglages de production",
    },
    expert: {
        difficulty: "EXPERT",
        description: "Réglages de production : c'est la référence à battre",
    },

    /**
     * MESURÉE ET REJETÉE — ne pas re-tester sans une raison neuve.
     *
     * L'idée : le létal adverse ne dispose que de 450 nœuds, et une ligne létale passant par le
     * retrait d'une Provocation en demande facilement plus. Rater ce létal fait créditer la ligne
     * d'une riposte inoffensive, donc marcher droit dans la mort au tour suivant.
     *
     * Résultat sur 400 parties appariées, decks miroir, budget en nœuds :
     *   205 – 195, score 51,2 % (IC 95 % : 46,6 % – 55,9 %), LLR +0,09 → INDÉCIS.
     *
     * La variante fait pourtant bien ce pour quoi elle est écrite : les ripostes tronquées tombent
     * de 7457 à 4793, et le repli « aucune riposte complète » de 8,6 % à 4,9 %. Elle voit donc
     * réellement plus de létaux adverses — ça ne se convertit simplement pas en victoires. Et elle
     * le paie cher : latence moyenne 517 ms contre 195 ms, p95 3635 ms contre 927 ms. À budget de
     * TEMPS de production, ces nœuds seraient pris au faisceau principal : la variante y serait
     * donc strictement perdante.
     *
     * L'enseignement dépasse ce réglage : faire baisser le taux de repli du pli de riposte, qu'on
     * soupçonnait d'être le verrou, n'a rien rapporté. Le repli dominant reste « une seule ligne
     * candidate » (23 %, inchangé), et c'est une limite du FAISCEAU, pas du budget de riposte.
     */
    "expert-deep-reply-lethal": {
        difficulty: "EXPERT",
        description: "Létal adverse sur 3000 nœuds au lieu de 450 — mesurée, sans gain (51,2 %)",
        config: { replyLethalMaxNodes: 3000 },
    },

    /**
     * Point D du plan. Le pli de riposte ne départage que 5 premiers coups, choisis sur le score
     * STATIQUE de fin de tour : une ligne médiocre statiquement mais excellente après riposte
     * n'entre jamais dans la liste. Élargir coûte du temps par candidat — arbitrage à mesurer,
     * pas à deviner.
     */
    "expert-wide-reply": {
        difficulty: "EXPERT",
        description: "8 lignes re-notées au lieu de 5",
        config: { replyCandidates: 8 },
    },

    /**
     * MESURÉE ET REJETÉE — l'implémentation reste, désactivée par défaut. Lire la RAISON avant de
     * la réactiver : elle disqualifie la famille d'idées entière, pas ce réglage.
     *
     * TROISIÈME PLI. L'Expert s'arrêtait après la riposte adverse et notait la position au jugé
     * statique. L'hypothèse : il ne distingue pas une ligne qui cède deux points de plateau mais
     * met l'adversaire à portée de létal d'une ligne qui les garde sans rien menacer. On pousse
     * donc la simulation d'un pli de plus — mon tour, sa riposte, MON létal — et la ligne qui mène
     * au létal reçoit une prime symétrique de `OPPONENT_LETHAL_PENALTY`.
     *
     * Résultat sur 800 parties appariées, decks miroir, budget en nœuds :
     *   49,3 % (IC 95 % : 46,2 % – 52,3 %), LLR -1,42 → INDÉCIS, sans la moindre tendance au gain.
     *   Latence moyenne 331 ms contre 197 ms, p95 1433 ms contre 931 ms.
     *
     * LA RAISON, et c'est elle qui compte : le pli repère un létal sur 7,6 % des décisions, mais
     * ne DÉPLACE le choix que sur 0,8 % d'entre elles. Neuf fois sur dix, la ligne qui mène au
     * létal dominait déjà le classement statique — la prime renchérit sur un gagnant déjà désigné.
     *
     * Autrement dit, `evaluate_game_state` est déjà un bon indicateur de « je suis sur le point de
     * gagner » : plateau, dégâts au héros et tempo suffisent. Chercher explicitement le létal du
     * tour suivant est REDONDANT avec l'évaluation, pas complémentaire. Toute variante du même
     * genre — létal à deux tours, prime de portée — se heurtera au même mur tant que la fonction
     * d'évaluation restera aussi corrélée à l'issue.
     *
     * Le compteur « dont la prime a déplacé le choix » (`ownLethalChangedChoice`) est ce qui a
     * permis de le voir. Le taux de détection seul (7,6 %) donnait l'illusion d'un pli très actif.
     */
    "expert-own-lethal": {
        difficulty: "EXPERT",
        description: "Létal de l'IA au tour suivant — mesurée, sans gain (49,3 %)",
        config: { replyOwnLethalMaxNodes: 600 },
    },

    /**
     * Adversaire simulé nettement plus fort (faisceau de riposte doublé). Si l'Expert gagne du
     * winrate ici, c'est que son modèle d'adversaire est aujourd'hui trop faible et qu'il se croit
     * en sécurité trop souvent.
     */
    "expert-strong-opponent-model": {
        difficulty: "EXPERT",
        description: "Faisceau de riposte 6/14/2000 au lieu de 3/8/900",
        config: { replyBeamWidth: 6, replyTopK: 14, replyMaxNodes: 2000 },
    },
} as const satisfies Record<string, AiVariantDefinition>;

export type AiVariantName = keyof typeof AI_VARIANTS;

export const AI_VARIANT_NAMES = Object.keys(AI_VARIANTS) as AiVariantName[];

/** Une variante résolue : difficulté et réglages complets, prêts à être joués. */
export interface ResolvedAiVariant {
    name: string;
    difficulty: AiDifficulty;
    config: ExpertAiConfig;
}

/**
 * Réglages complets d'une difficulté. Le Débutant n'en a aucun (il ne cherche pas) et l'Avancé
 * ignore les champs `reply*` : on part malgré tout des défauts Expert pour que le type reste
 * unique côté banc d'essai.
 */
const defaultsForDifficulty = (difficulty: AiDifficulty): ExpertAiConfig =>
    difficulty === "EXPERT"
        ? { ...EXPERT_AI_DEFAULTS }
        : { ...EXPERT_AI_DEFAULTS, ...ADVANCED_AI_DEFAULTS };

const isAiDifficulty = (value: string): value is AiDifficulty =>
    (AI_DIFFICULTIES as readonly string[]).includes(value);

const isVariantName = (value: string): value is AiVariantName => value in AI_VARIANTS;

/**
 * Résout un camp du banc d'essai.
 *
 * Accepte indifféremment un nom de variante (`expert-deep-reply-lethal`) ou une difficulté brute
 * (`EXPERT`), pour que les lignes de commande déjà écrites continuent de marcher.
 *
 * `overrides` vient de `--left-set` / `--right-set` : il s'applique APRÈS la variante, ce qui
 * permet de balayer un paramètre autour d'une variante existante sans toucher au registre.
 */
export const resolveAiVariant = (
    spec: string,
    overrides: Partial<ExpertAiConfig> = {},
): ResolvedAiVariant => {
    const trimmed = spec.trim();

    if (isVariantName(trimmed)) {
        const variant: AiVariantDefinition = AI_VARIANTS[trimmed];

        return {
            name: trimmed,
            difficulty: variant.difficulty,
            config: {
                ...defaultsForDifficulty(variant.difficulty),
                ...variant.config,
                ...overrides,
            },
        };
    }

    const upper = trimmed.toUpperCase();

    if (isAiDifficulty(upper)) {
        return {
            name: upper,
            difficulty: upper,
            config: { ...defaultsForDifficulty(upper), ...overrides },
        };
    }

    throw new Error(
        `Variante inconnue « ${spec} ». Attendu : ${AI_VARIANT_NAMES.join(", ")} ` +
            `ou une difficulté (${AI_DIFFICULTIES.join(", ")}).`,
    );
};

/** Champs de `ExpertAiConfig` surchargeables en ligne de commande. */
const OVERRIDABLE_KEYS = Object.keys(EXPERT_AI_DEFAULTS) as (keyof ExpertAiConfig)[];

/**
 * Analyse `--left-set=beamWidth=14,replyCandidates=8`.
 *
 * On refuse une clé inconnue plutôt que de l'ignorer : une faute de frappe silencieuse ferait
 * tourner des heures de banc d'essai sur le réglage qu'on croyait avoir changé.
 */
export const parseConfigOverrides = (raw: string | undefined): Partial<ExpertAiConfig> => {
    if (!raw) return {};

    const overrides: Partial<ExpertAiConfig> = {};

    for (const entry of raw.split(",")) {
        const trimmed = entry.trim();
        if (trimmed === "") continue;

        const [key, value] = trimmed.split("=");
        const parsed = Number(value);

        if (!key || value === undefined || !Number.isFinite(parsed)) {
            throw new Error(`Surcharge invalide « ${trimmed} » (attendu : cle=nombre).`);
        }

        const typedKey = OVERRIDABLE_KEYS.find((candidate) => candidate === key);

        if (!typedKey) {
            throw new Error(
                `Réglage inconnu « ${key} ». Attendu : ${OVERRIDABLE_KEYS.join(", ")}.`,
            );
        }

        overrides[typedKey] = parsed;
    }

    return overrides;
};
