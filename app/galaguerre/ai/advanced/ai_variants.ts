import { AI_DIFFICULTIES, type AiDifficulty } from "#api_types/game.types";
import { ADVANCED_AI_DEFAULTS } from "./advanced_ai_config.js";
import { MIDRANGE_WEIGHTS, type EvaluationWeights } from "./evaluate_game_state.js";
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
    /**
     * Surcharges des poids d'évaluation, appliquées PAR-DESSUS le jeu de poids du profil de deck.
     *
     * Séparées de `config` à dessein : ce ne sont pas des réglages de recherche, elles ne
     * s'exposent pas en base et ne se règlent pas en production. Ce sont les coefficients de
     * `evaluate_game_state.ts`, réglés à la main et jamais mesurés — l'objet même de la fiche
     * `docs/to_try/02-regler-la-fonction-devaluation.md`.
     */
    weights?: Partial<EvaluationWeights>;
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
     * MESURÉE ET REJETÉE — ne pas re-tester sans changer d'abord le BUDGET, pas le nombre.
     *
     * L'idée : le pli de riposte ne départage que 5 premiers coups, choisis sur le score STATIQUE
     * de fin de tour. Une ligne médiocre statiquement mais excellente après riposte n'entre jamais
     * dans la liste.
     *
     * Résultat sur 800 parties appariées, decks miroir, budget en nœuds :
     *   48,4 % (IC 95 % : 45,3 % – 51,4 %), LLR -2,15 — à un cheveu de la borne de rejet.
     *
     * Le mécanisme est lisible dans les compteurs : les ripostes TRONQUÉES passent de 13802 à
     * 21152 (+53 %). La tranche de temps d'une décision est fixe et se divise entre les candidats ;
     * en ajouter trois les affame tous. Les lignes ajoutées reviennent incomplètes, donc écartées
     * du classement — on a payé leur simulation pour ne rien pouvoir en faire. Le taux de
     * départage ne bouge pas d'un cheveu : 89,5 % contre 89,4 %.
     *
     * Ce que ça disqualifie : élargir `replyCandidates` À BUDGET CONSTANT est structurellement
     * perdant, quel que soit le nombre. La question n'a de sens qu'accompagnée d'un budget par
     * candidat garanti, ou d'un approfondissement itératif qui n'accorde du temps supplémentaire
     * qu'aux lignes encore en course.
     */
    "expert-wide-reply": {
        difficulty: "EXPERT",
        description: "8 lignes re-notées au lieu de 5 — mesurée, sans gain (48,4 %)",
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
     * MESURÉE ET REJETÉE. C'était le test décisif d'une hypothèse tentante : si l'Expert gagnait du
     * winrate en simulant un adversaire plus fort, c'est que son modèle d'adversaire était trop
     * faible et qu'il se croyait en sécurité trop souvent.
     *
     * Résultat sur 800 parties appariées, decks miroir, budget en nœuds :
     *   49,3 % (IC 95 % : 46,1 % – 52,4 %), LLR -1,35. Latence 244 ms contre 195 ms.
     *
     * Ce que ça disqualifie : la faiblesse du modèle d'adversaire n'est PAS ce qui limite l'Expert.
     * Doubler le faisceau de riposte et plus que doubler ses nœuds ne change rien à sa force. Avec
     * `expert-deep-reply-lethal` et `expert-wide-reply`, cela fait trois façons différentes de
     * donner plus de moyens au pli de riposte, pour trois fois rien. Le pli de riposte est un
     * problème RÉSOLU : il départage déjà 89 % des décisions et le faire mieux ne paie plus.
     */
    "expert-strong-opponent-model": {
        difficulty: "EXPERT",
        description: "Faisceau de riposte 6/14/2000 — mesurée, sans gain (49,3 %)",
        config: { replyBeamWidth: 6, replyTopK: 14, replyMaxNodes: 2000 },
    },

    /**
     * MESURÉE ET REJETÉE — l'implémentation reste, désactivée par défaut. C'est le rejet le plus
     * informatif de la série : lire la conclusion avant d'ouvrir une piste sur le CHOIX de la ligne.
     *
     * Première idée qui ne donnait PAS plus de moyens au pli de riposte — les trois rejets
     * précédents avaient fermé cette famille. Elle changeait ce qu'on FAIT d'un résultat incertain.
     *
     * Une décision sur neuf retombe sur le choix de l'IA Avancée faute d'une seule riposte
     * « complète ». Or « incomplète » ne veut pas dire « non simulée » : au banc, l'échéance étant
     * infinie, le critère se réduit à « le létal adverse a épuisé ses 450 nœuds sans conclure ». Le
     * faisceau de riposte, lui, a bel et bien tourné, et son score est exploitable. On départage
     * donc ces lignes entre elles plutôt que de rendre la main au faisceau, qui n'a jamais regardé
     * la riposte du tout — le classement de repli restant STRICTEMENT séparé du classement
     * principal, sans quoi l'absence de preuve de létal jouerait en faveur de la ligne incertaine.
     *
     * Résultat sur 800 parties appariées, decks miroir, budget en nœuds :
     *   49,5 % (IC 95 % : 46,4 % – 52,6 %), LLR -1,20. Latence 191 ms contre 185 ms.
     *
     * LA RAISON, et elle vaut pour toute une famille : le classement de repli a réellement DÉPLACÉ
     * la ligne jouée sur 3,0 % des décisions — près de quatre fois le taux de déplacement du
     * troisième pli, qui était déjà le mécanisme le plus actif jamais mesuré ici. Six cents
     * décisions par lot de 800 parties ont donc changé, et le winrate n'a pas bougé d'un cheveu.
     *
     * Ce que ça disqualifie : DÉPARTAGER MIEUX les lignes que le faisceau propose ne paie plus. Ce
     * n'est plus une conjecture sur un mécanisme particulier, c'est une mesure directe — on a changé
     * le choix, souvent, sans rien gagner. Les lignes candidates d'une même position se valent trop
     * pour que leur ordre compte. Ce qui reste ouvert est en amont (ce que le faisceau PRODUIT) et
     * en dessous (comment une position est VALUÉE), pas dans l'arbitrage entre les deux.
     *
     * Corollaire immédiat, pour ne pas les re-tester : la pénalité d'incertitude et sa graduation
     * par la borne optimiste de dégâts (points 1 et 3 de `docs/to_try/04-ripostes-incompletes.md`)
     * sont mortes avec celle-ci. Elles ne diffèrent que par la FORCE avec laquelle une riposte
     * incertaine pèse sur le classement ; on vient de mesurer que ce classement n'a pas de valeur
     * dans ces positions, et elles ajoutent le risque de laisser une ligne non vérifiée écarter une
     * ligne vérifiée.
     */
    "expert-rank-incomplete": {
        difficulty: "EXPERT",
        description: "Départager les ripostes au létal non réfuté — mesurée, sans gain (49,5 %)",
        config: { replyRankIncomplete: 1 },
    },
} as const satisfies Record<string, AiVariantDefinition>;

export type AiVariantName = keyof typeof AI_VARIANTS;

export const AI_VARIANT_NAMES = Object.keys(AI_VARIANTS) as AiVariantName[];

/** Une variante résolue : difficulté et réglages complets, prêts à être joués. */
export interface ResolvedAiVariant {
    name: string;
    difficulty: AiDifficulty;
    config: ExpertAiConfig;
    /**
     * Vide pour toute variante qui ne touche pas à l'évaluation, c'est-à-dire pour toutes celles
     * mesurées jusqu'ici. Reste PARTIEL : les poids du profil de deck servent de base, et une
     * surcharge n'écrase que les coefficients qu'elle nomme.
     */
    weights: Partial<EvaluationWeights>;
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
    weightOverrides: Partial<EvaluationWeights> = {},
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
            weights: { ...variant.weights, ...weightOverrides },
        };
    }

    const upper = trimmed.toUpperCase();

    if (isAiDifficulty(upper)) {
        return {
            name: upper,
            difficulty: upper,
            config: { ...defaultsForDifficulty(upper), ...overrides },
            weights: { ...weightOverrides },
        };
    }

    throw new Error(
        `Variante inconnue « ${spec} ». Attendu : ${AI_VARIANT_NAMES.join(", ")} ` +
            `ou une difficulté (${AI_DIFFICULTIES.join(", ")}).`,
    );
};

/** Champs de `ExpertAiConfig` surchargeables en ligne de commande. */
const OVERRIDABLE_KEYS = Object.keys(EXPERT_AI_DEFAULTS) as (keyof ExpertAiConfig)[];

/** Coefficients d'évaluation surchargeables en ligne de commande. */
const OVERRIDABLE_WEIGHT_KEYS = Object.keys(MIDRANGE_WEIGHTS) as (keyof EvaluationWeights)[];

/**
 * Analyse une liste `cle=nombre,cle=nombre`.
 *
 * On refuse une clé inconnue plutôt que de l'ignorer : une faute de frappe silencieuse ferait
 * tourner des heures de banc d'essai sur le réglage qu'on croyait avoir changé.
 */
const parseNumericOverrides = <Key extends string>(
    raw: string | undefined,
    allowedKeys: Key[],
    label: string,
): Partial<Record<Key, number>> => {
    if (!raw) return {};

    const overrides: Partial<Record<Key, number>> = {};

    for (const entry of raw.split(",")) {
        const trimmed = entry.trim();
        if (trimmed === "") continue;

        const [key, value] = trimmed.split("=");
        const parsed = Number(value);

        if (!key || value === undefined || !Number.isFinite(parsed)) {
            throw new Error(`Surcharge invalide « ${trimmed} » (attendu : cle=nombre).`);
        }

        const typedKey = allowedKeys.find((candidate) => candidate === key);

        if (!typedKey) {
            throw new Error(`${label} inconnu « ${key} ». Attendu : ${allowedKeys.join(", ")}.`);
        }

        overrides[typedKey] = parsed;
    }

    return overrides;
};

/** Analyse `--left-set=beamWidth=14,replyCandidates=8`. */
export const parseConfigOverrides = (raw: string | undefined): Partial<ExpertAiConfig> =>
    parseNumericOverrides(raw, OVERRIDABLE_KEYS, "Réglage");

/**
 * Analyse `--left-weights=board=1.3,handCard=2.0`.
 *
 * Ces coefficients ne sont surchargeables QU'ICI, pas en base : ce sont des paramètres de réglage
 * hors ligne, pas des leviers d'exploitation. Voir `docs/to_try/02-regler-la-fonction-devaluation.md`.
 */
export const parseWeightOverrides = (raw: string | undefined): Partial<EvaluationWeights> =>
    parseNumericOverrides(raw, OVERRIDABLE_WEIGHT_KEYS, "Coefficient d'évaluation");
