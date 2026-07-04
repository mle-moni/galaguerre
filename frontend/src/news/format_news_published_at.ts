const RELATIVE_TIME_FORMATTER = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

export const formatNewsPublishedAt = (publishedAt: string): string => {
    const date = new Date(publishedAt);
    const diffMs = date.getTime() - Date.now();
    const absDiffMs = Math.abs(diffMs);

    if (absDiffMs < HOUR_MS) {
        const minutes = Math.round(diffMs / MINUTE_MS);
        return RELATIVE_TIME_FORMATTER.format(minutes, "minute");
    }

    if (absDiffMs < DAY_MS) {
        const hours = Math.round(diffMs / HOUR_MS);
        return RELATIVE_TIME_FORMATTER.format(hours, "hour");
    }

    const days = Math.round(diffMs / DAY_MS);
    return RELATIVE_TIME_FORMATTER.format(days, "day");
};

export const formatNewsPublishedAtLong = (publishedAt: string): string =>
    new Date(publishedAt).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
