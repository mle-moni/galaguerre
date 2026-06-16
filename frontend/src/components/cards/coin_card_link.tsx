import { COIN_CARD_ID } from "#api_types/game.types";
import { getCardPreviewById } from "#api_types/card_preview";
import type { ReactNode } from "react";
import { CardPreviewLink } from "./card_preview_link.jsx";

interface CoinCardLinkProps {
    children: ReactNode;
}

export const CoinCardLink = ({ children }: CoinCardLinkProps) => {
    const coin = getCardPreviewById(COIN_CARD_ID);
    if (!coin) return children;

    return <CardPreviewLink card={coin}>{children}</CardPreviewLink>;
};
