import { getNumberAppSetting } from "#services/settings/get_app_setting";
import type { AdvancedAiConfig } from "./advanced_ai_config.js";

/**
 * Réglages de l'IA « Expert ». Même principe que `advanced_ai_config.ts` : surchargeables en base
 * (table `app_settings`) pour pouvoir dégonfler la charge serveur sans redéploiement.
 *
 * L'Expert cherche plus large que l'Avancé, mais surtout il dépense une part de son budget à
 * SIMULER LE TOUR ADVERSE (`search_opponent_reply.ts`). Cette réplique est appelée une fois par
 * ligne candidate : elle doit rester étroite, d'où un jeu de paramètres `reply*` distinct.
 */

export const EXPERT_AI_SETTING_KEYS = {
    maxThinkMs: "ai.expert.maxThinkMs",
    minThinkMs: "ai.expert.minThinkMs",
    beamWidth: "ai.expert.beamWidth",
    topK: "ai.expert.topK",
    maxNodes: "ai.expert.maxNodes",
    replyCandidates: "ai.expert.replyCandidates",
    replyBeamWidth: "ai.expert.replyBeamWidth",
    replyTopK: "ai.expert.replyTopK",
    replyMaxNodes: "ai.expert.replyMaxNodes",
    replyLethalMaxNodes: "ai.expert.replyLethalMaxNodes",
    replyOwnLethalMaxNodes: "ai.expert.replyOwnLethalMaxNodes",
    replyRankIncomplete: "ai.expert.replyRankIncomplete",
} as const;

export const EXPERT_AI_DEFAULTS = {
    maxThinkMs: 4000,
    // Plancher plus haut que l'Avancé : même une position simple doit laisser à la recherche de
    // réplique de quoi simuler un tour adverse, sinon l'Expert n'est qu'un Avancé plus lent.
    minThinkMs: 600,
    beamWidth: 10,
    topK: 18,
    maxNodes: 12_000,
    /** Nombre de lignes finales re-notées par simulation du tour adverse. */
    replyCandidates: 5,
    replyBeamWidth: 3,
    replyTopK: 8,
    replyMaxNodes: 900,
    /**
     * Plafond de nœuds du létal ADVERSE cherché dans chaque riposte. Distinct de `replyMaxNodes`
     * pour que le létal et le faisceau de riposte cessent de se disputer un budget commun : un
     * létal introuvable pouvait manger toute la tranche et laisser la riposte à zéro nœud, donc
     * incomplète, donc le candidat écarté du classement.
     *
     * La VALEUR, elle, reste celle d'origine (`replyMaxNodes / 2`). Monter à 3000 a été mesuré sur
     * 400 parties appariées : 51,2 % (IC 95 % : 46,6 % – 55,9 %), aucun gain démontré, pour une
     * latence p95 multipliée par quatre. Voir `expert-deep-reply-lethal` dans `ai_variants.ts`
     * avant de retoucher ce nombre.
     */
    replyLethalMaxNodes: 450,
    /**
     * Plafond de nœuds du TROISIÈME pli : le létal de l'IA à son propre tour suivant, cherché sur
     * l'état où la riposte adverse a été jouée. `0` désactive le pli.
     *
     * DÉSACTIVÉ après mesure : 49,3 % sur 800 parties appariées, pour une latence moyenne
     * multipliée par 1,7. Le pli ne déplace le choix que sur 0,8 % des décisions où il trouve un
     * létal — il est redondant avec la fonction d'évaluation. Lire `expert-own-lethal` dans
     * `ai_variants.ts` avant de remettre une valeur ici.
     */
    replyOwnLethalMaxNodes: 0,
    /**
     * `1` autorise un classement de REPLI entre les lignes dont la riposte a été simulée mais dont
     * le létal adverse n'a pas pu être réfuté. Ce classement n'entre en jeu que si AUCUNE ligne
     * n'est complète — sinon l'Expert retombe sur le choix de l'IA Avancée, qui n'a jamais regardé
     * la riposte du tout. `0` rend le comportement historique.
     *
     * DÉSACTIVÉ après mesure : 49,5 % sur 800 parties appariées. Le classement déplace pourtant la
     * ligne jouée sur 3,0 % des décisions — il agit, il ne sert simplement à rien. Lire
     * `expert-rank-incomplete` dans `ai_variants.ts` avant de remettre `1` ici : sa conclusion
     * porte sur toute la famille des idées qui départagent mieux, pas sur ce réglage.
     */
    replyRankIncomplete: 0,
} as const;

export interface ExpertAiConfig extends AdvancedAiConfig {
    replyCandidates: number;
    replyBeamWidth: number;
    replyTopK: number;
    replyMaxNodes: number;
    replyLethalMaxNodes: number;
    replyOwnLethalMaxNodes: number;
    /** Drapeau 0/1 : voir `EXPERT_AI_DEFAULTS.replyRankIncomplete`. */
    replyRankIncomplete: number;
}

/**
 * Part de la tranche d'une ligne candidate réservée au létal adverse. Le reste va au faisceau de
 * riposte : sans ce plafond, un létal introuvable peut manger toute la tranche et laisser la
 * riposte à zéro nœud — donc incomplète, donc le candidat écarté du classement.
 */
export const EXPERT_REPLY_LETHAL_TIME_SHARE = 0.6;

/**
 * Part de la tranche d'une ligne candidate réservée au troisième pli (létal de l'IA au tour
 * suivant). Prise sur ce qui reste après le létal adverse et le faisceau de riposte.
 *
 * Ce pli passe volontairement en DERNIER : une prime non attribuée faute de temps ne fait que
 * ramener la ligne à sa note statique, alors qu'un létal adverse manqué fait mourir l'IA. Les
 * deux erreurs n'ont pas le même prix, elles n'ont pas la même priorité de budget.
 */
export const EXPERT_REPLY_OWN_LETHAL_TIME_SHARE = 0.25;

/**
 * Répartition du budget d'une décision. La recherche de réplique passe en dernier : si le temps
 * manque, elle rend ce qu'elle a et l'Expert retombe simplement sur le choix de l'Avancé.
 */
export const EXPERT_BUDGET_SHARES = {
    /** Létal offensif : rater un létal reste l'erreur la plus chère. */
    lethal: 0.2,
    /** Faisceau principal sur le tour de l'IA. */
    beam: 0.4,
    /** Re-notation à deux plis : c'est ce qui distingue l'Expert, il lui faut sa part. */
    reply: 0.4,
} as const;

export const loadExpertAiConfig = async (): Promise<ExpertAiConfig> => {
    const [
        maxThinkMs,
        minThinkMs,
        beamWidth,
        topK,
        maxNodes,
        replyCandidates,
        replyBeamWidth,
        replyTopK,
        replyMaxNodes,
        replyLethalMaxNodes,
        replyOwnLethalMaxNodes,
        replyRankIncomplete,
    ] = await Promise.all([
        getNumberAppSetting(EXPERT_AI_SETTING_KEYS.maxThinkMs, EXPERT_AI_DEFAULTS.maxThinkMs, {
            min: 50,
            max: 30_000,
        }),
        getNumberAppSetting(EXPERT_AI_SETTING_KEYS.minThinkMs, EXPERT_AI_DEFAULTS.minThinkMs, {
            min: 0,
            max: 5_000,
        }),
        getNumberAppSetting(EXPERT_AI_SETTING_KEYS.beamWidth, EXPERT_AI_DEFAULTS.beamWidth, {
            min: 1,
            max: 48,
        }),
        getNumberAppSetting(EXPERT_AI_SETTING_KEYS.topK, EXPERT_AI_DEFAULTS.topK, {
            min: 1,
            max: 96,
        }),
        getNumberAppSetting(EXPERT_AI_SETTING_KEYS.maxNodes, EXPERT_AI_DEFAULTS.maxNodes, {
            min: 10,
            max: 300_000,
        }),
        getNumberAppSetting(
            EXPERT_AI_SETTING_KEYS.replyCandidates,
            EXPERT_AI_DEFAULTS.replyCandidates,
            { min: 1, max: 16 },
        ),
        getNumberAppSetting(
            EXPERT_AI_SETTING_KEYS.replyBeamWidth,
            EXPERT_AI_DEFAULTS.replyBeamWidth,
            { min: 1, max: 16 },
        ),
        getNumberAppSetting(EXPERT_AI_SETTING_KEYS.replyTopK, EXPERT_AI_DEFAULTS.replyTopK, {
            min: 1,
            max: 32,
        }),
        getNumberAppSetting(
            EXPERT_AI_SETTING_KEYS.replyMaxNodes,
            EXPERT_AI_DEFAULTS.replyMaxNodes,
            { min: 10, max: 20_000 },
        ),
        getNumberAppSetting(
            EXPERT_AI_SETTING_KEYS.replyLethalMaxNodes,
            EXPERT_AI_DEFAULTS.replyLethalMaxNodes,
            { min: 10, max: 50_000 },
        ),
        // Minimum 0 et non 10 : c'est la valeur qui DÉSACTIVE le troisième pli, donc le levier
        // d'urgence pour le couper en production sans redéploiement.
        getNumberAppSetting(
            EXPERT_AI_SETTING_KEYS.replyOwnLethalMaxNodes,
            EXPERT_AI_DEFAULTS.replyOwnLethalMaxNodes,
            { min: 0, max: 50_000 },
        ),
        getNumberAppSetting(
            EXPERT_AI_SETTING_KEYS.replyRankIncomplete,
            EXPERT_AI_DEFAULTS.replyRankIncomplete,
            { min: 0, max: 1 },
        ),
    ]);

    return {
        maxThinkMs,
        minThinkMs: Math.min(minThinkMs, maxThinkMs),
        beamWidth: Math.round(beamWidth),
        topK: Math.round(topK),
        maxNodes: Math.round(maxNodes),
        replyCandidates: Math.round(replyCandidates),
        replyBeamWidth: Math.round(replyBeamWidth),
        replyTopK: Math.round(replyTopK),
        replyMaxNodes: Math.round(replyMaxNodes),
        replyLethalMaxNodes: Math.round(replyLethalMaxNodes),
        replyOwnLethalMaxNodes: Math.round(replyOwnLethalMaxNodes),
        replyRankIncomplete: Math.round(replyRankIncomplete),
    };
};
