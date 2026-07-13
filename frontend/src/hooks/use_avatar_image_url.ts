import { useMemo } from "react";
import { getAvatarImageUrl } from "~/helpers/avatar_image_url";
import { useCardsQuery } from "~/hooks/use_cards";

export const useAvatarImageUrl = (avatarCardId: number | undefined) => {
    const cardsQuery = useCardsQuery({ includeNonCollectible: true });

    const catalogById = useMemo(
        () => new Map((cardsQuery.data ?? []).map((card) => [card.id, card])),
        [cardsQuery.data],
    );

    return getAvatarImageUrl(avatarCardId, catalogById);
};
