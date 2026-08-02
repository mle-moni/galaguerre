import AppSetting from "#models/app_setting";

/**
 * Lecture de réglages runtime stockés en base, avec un cache in-process court.
 *
 * Permet par exemple de réduire le budget de réflexion de l'IA avancée si la charge devient
 * trop importante, sans redéployer.
 */

const CACHE_TTL_MS = 30_000;

interface CacheEntry {
    value: unknown;
    expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

/** Clés dont l'échec de lecture a déjà été logué, pour ne pas répéter à chaque expiration. */
const reportedFailures = new Set<string>();

export const clearAppSettingsCache = (): void => {
    cache.clear();
    reportedFailures.clear();
};

const readSetting = async (key: string): Promise<unknown> => {
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    let value: unknown;
    try {
        const row = await AppSetting.find(key);
        value = row?.value;
    } catch (error) {
        // Un réglage indisponible ne doit jamais casser une partie : on retombe sur le défaut.
        // Le cache faisant réessayer toutes les 30 s, on ne log qu'une fois par clé (typiquement
        // une migration pas encore jouée) pour ne pas noyer les logs.
        if (!reportedFailures.has(key)) {
            reportedFailures.add(key);
            console.error(`Failed to read app setting "${key}", falling back to default:`, error);
        }
        value = undefined;
    }

    cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
};

export const getNumberAppSetting = async (
    key: string,
    defaultValue: number,
    { min, max }: { min?: number; max?: number } = {},
): Promise<number> => {
    const raw = await readSetting(key);
    const parsed = typeof raw === "number" ? raw : Number(raw);

    if (!Number.isFinite(parsed)) return defaultValue;

    let value = parsed;
    if (min !== undefined) value = Math.max(min, value);
    if (max !== undefined) value = Math.min(max, value);

    return value;
};
