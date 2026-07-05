export const isNewsPublished = (publishedAt: string, now = Date.now()): boolean =>
    import.meta.env.DEV || new Date(publishedAt).getTime() <= now;
