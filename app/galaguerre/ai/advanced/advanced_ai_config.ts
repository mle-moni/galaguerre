import { getNumberAppSetting } from "#services/settings/get_app_setting";

/**
 * Réglages de la recherche de l'IA avancée, surchargeables en base (table `app_settings`) pour
 * pouvoir réduire la charge sans redéploiement.
 */

export const ADVANCED_AI_SETTING_KEYS = {
    maxThinkMs: "ai.advanced.maxThinkMs",
    minThinkMs: "ai.advanced.minThinkMs",
    beamWidth: "ai.advanced.beamWidth",
    topK: "ai.advanced.topK",
    maxNodes: "ai.advanced.maxNodes",
} as const;

export const ADVANCED_AI_DEFAULTS = {
    maxThinkMs: 2000,
    minThinkMs: 150,
    beamWidth: 6,
    topK: 12,
    maxNodes: 4000,
} as const;

/** Profondeur maximale : un tour dépasse rarement une douzaine d'actions. */
export const MAX_SEARCH_DEPTH = 12;

export interface AdvancedAiConfig {
    maxThinkMs: number;
    minThinkMs: number;
    beamWidth: number;
    topK: number;
    maxNodes: number;
}

export const loadAdvancedAiConfig = async (): Promise<AdvancedAiConfig> => {
    const [maxThinkMs, minThinkMs, beamWidth, topK, maxNodes] = await Promise.all([
        getNumberAppSetting(ADVANCED_AI_SETTING_KEYS.maxThinkMs, ADVANCED_AI_DEFAULTS.maxThinkMs, {
            min: 50,
            max: 15_000,
        }),
        getNumberAppSetting(ADVANCED_AI_SETTING_KEYS.minThinkMs, ADVANCED_AI_DEFAULTS.minThinkMs, {
            min: 0,
            max: 5_000,
        }),
        getNumberAppSetting(ADVANCED_AI_SETTING_KEYS.beamWidth, ADVANCED_AI_DEFAULTS.beamWidth, {
            min: 1,
            max: 32,
        }),
        getNumberAppSetting(ADVANCED_AI_SETTING_KEYS.topK, ADVANCED_AI_DEFAULTS.topK, {
            min: 1,
            max: 64,
        }),
        getNumberAppSetting(ADVANCED_AI_SETTING_KEYS.maxNodes, ADVANCED_AI_DEFAULTS.maxNodes, {
            min: 10,
            max: 100_000,
        }),
    ]);

    return {
        maxThinkMs,
        minThinkMs: Math.min(minThinkMs, maxThinkMs),
        beamWidth: Math.round(beamWidth),
        topK: Math.round(topK),
        maxNodes: Math.round(maxNodes),
    };
};

/**
 * Budget adaptatif : un début de partie à 1 mana et 2 coups légaux ne mérite pas 2 secondes de
 * réflexion, un tour à plateau plein et main pleine si.
 */
export const computeThinkBudgetMs = (
    config: AdvancedAiConfig,
    { legalMoveCount, mana }: { legalMoveCount: number; mana: number },
): number => {
    const complexity = legalMoveCount / 30 + mana / 10;
    const budget = config.maxThinkMs * Math.min(1, Math.max(0.1, complexity));

    return Math.round(Math.max(config.minThinkMs, Math.min(config.maxThinkMs, budget)));
};
