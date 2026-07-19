import { BetaOpeningContent } from "./beta_opening_content.jsx";
import { defineNews, type NewsEntry } from "./define_news.js";
import { CARD_RECAPS, type CardRecapData } from "./generated/card_recaps.js";
import { formatRecapShortDescription, formatRecapTitle } from "./format_recap_summary.js";
import { isNewsPublished } from "./is_news_published.js";
import { createNewsRecapContent } from "./news_recap_content.jsx";

const CARD_RECAP_NEWS: NewsEntry[] = CARD_RECAPS.map((recap) =>
    defineNews(recap.slug, {
        title: formatRecapTitle(recap.date),
        shortDescription: formatRecapShortDescription(recap),
        imageUrl: recap.imageUrl,
        goldenVideoUrl: recap.goldenVideoUrl,
        publishedAt: recap.publishedAt,
        Content: createNewsRecapContent(recap),
    }),
);

const EDITORIAL_NEWS: NewsEntry[] = [
    defineNews("ouverture-de-la-beta", {
        title: "Ouverture de la beta",
        shortDescription:
            "Galaguerre ouvre sa beta : découvrez le jeu de cartes en duel et ses fonctionnalités principales.",
        imageUrl: "/home/hero-bg.webp",
        publishedAt: "2026-07-06T09:00:00+02:00",
        Content: BetaOpeningContent,
    }),
];

const ALL_NEWS_UNSORTED: NewsEntry[] = [...EDITORIAL_NEWS, ...CARD_RECAP_NEWS];

const sortNewsByPublishedAtDesc = (entries: NewsEntry[]): NewsEntry[] =>
    [...entries].sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );

export const GALAGUERRE_NEWS: NewsEntry[] = sortNewsByPublishedAtDesc(
    ALL_NEWS_UNSORTED.filter((entry) => isNewsPublished(entry.publishedAt)),
);

const newsBySlug = new Map(ALL_NEWS_UNSORTED.map((entry) => [entry.slug, entry]));

export const getNewsBySlug = (slug: string): NewsEntry | undefined => {
    const entry = newsBySlug.get(slug);
    if (!entry || !isNewsPublished(entry.publishedAt)) return undefined;
    return entry;
};

export const getLatestNews = (limit = 3): NewsEntry[] => GALAGUERRE_NEWS.slice(0, limit);

export const getNewsRecapBySlug = (slug: string): CardRecapData | undefined =>
    CARD_RECAPS.find((recap) => recap.slug === slug);
