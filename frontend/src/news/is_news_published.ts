// export const isNewsPublished = (publishedAt: string, now = Date.now()): boolean =>
//     new Date(publishedAt).getTime() <= now;
export const isNewsPublished = (publishedAt: string, now = Date.now()): boolean => true;
