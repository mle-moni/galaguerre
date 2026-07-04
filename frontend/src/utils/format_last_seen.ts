import { DateTime } from "luxon";

export const formatLastSeen = (isoDate: string): string => {
    const dt = DateTime.fromISO(isoDate).setLocale("fr");
    const diffMs = DateTime.now().diff(dt).as("milliseconds");

    if (diffMs < 60_000) return "à l'instant";

    return dt.toRelative() ?? "récemment";
};
