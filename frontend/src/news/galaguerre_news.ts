import { defineNews, type NewsEntry } from "./define_news.js";
import { WEEKLY_RECAPS, type WeeklyRecapData } from "./generated/weekly_recaps.js";
import { formatRecapShortDescription, formatRecapTitle } from "./format_recap_summary.js";
import { createNewsRecapContent } from "./news_recap_content.jsx";

const GALAGUERRE_NEWS_UNSORTED: NewsEntry[] = WEEKLY_RECAPS.map((recap) =>
    defineNews(recap.slug, {
        title: formatRecapTitle(recap.week),
        shortDescription: formatRecapShortDescription(recap),
        imageUrl: recap.imageUrl,
        publishedAt: recap.publishedAt,
        Content: createNewsRecapContent(recap),
    }),
);

export const GALAGUERRE_NEWS: NewsEntry[] = [...GALAGUERRE_NEWS_UNSORTED].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
);

const newsBySlug = new Map(GALAGUERRE_NEWS.map((entry) => [entry.slug, entry]));

export const getNewsBySlug = (slug: string): NewsEntry | undefined => newsBySlug.get(slug);

export const getLatestNews = (limit = 3): NewsEntry[] => GALAGUERRE_NEWS.slice(0, limit);

export const getNewsRecapBySlug = (slug: string): WeeklyRecapData | undefined =>
    WEEKLY_RECAPS.find((recap) => recap.slug === slug);
