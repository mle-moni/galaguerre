import type { ReactNode } from "react";

export type NewsEntry = {
    slug: string;
    title: string;
    shortDescription: string;
    imageUrl: string;
    /** Present when the thumb is featured for a new golden version. */
    goldenVideoUrl?: string | null;
    /** ISO 8601 datetime, e.g. 2026-07-02T10:00:00+02:00 */
    publishedAt: string;
    Content: () => ReactNode;
};

export const defineNews = (slug: string, entry: Omit<NewsEntry, "slug">): NewsEntry => ({
    slug,
    ...entry,
});
