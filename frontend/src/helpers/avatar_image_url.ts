import type { ApiCatalogCard } from "#api_types/deck.types";

export const DEFAULT_AVATAR_CARD_ID = 148;

export const getAvatarImageUrl = (
    avatarCardId: number | undefined,
    catalogById: Map<number, ApiCatalogCard>,
    fallbackCardId = DEFAULT_AVATAR_CARD_ID,
): string | null => catalogById.get(avatarCardId ?? fallbackCardId)?.imageUrl ?? null;
