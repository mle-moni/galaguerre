export type EventSeedEntry = {
    id: number;
    title: string;
    shortDescription: string;
    longDescription: string;
    imageUrl: string;
    /** ISO 8601 datetime, e.g. 2026-07-06T16:30:00+02:00 */
    startsAt: string;
};

export const defineEvent = (id: number, entry: Omit<EventSeedEntry, "id">): EventSeedEntry => ({
    id,
    ...entry,
});
