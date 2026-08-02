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
} as const;

export interface ExpertAiConfig extends AdvancedAiConfig {
    replyCandidates: number;
    replyBeamWidth: number;
    replyTopK: number;
    replyMaxNodes: number;
}

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
    };
};
