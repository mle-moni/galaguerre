export const playerOwnsGoldenCard = (
    cardId: number,
    goldenVideoUrl: string | null,
    ownedGoldenCardIds: readonly number[],
): boolean => ownedGoldenCardIds.includes(cardId) && Boolean(goldenVideoUrl);
