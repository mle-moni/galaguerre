import { COIN_CARD_PREVIEW } from "#api_types/coin";
import type { ReactNode } from "react";
import { CardPreviewLink } from "./card_preview_link.jsx";

interface CoinCardLinkProps {
    children: ReactNode;
}

export const CoinCardLink = ({ children }: CoinCardLinkProps) => (
    <CardPreviewLink card={COIN_CARD_PREVIEW}>{children}</CardPreviewLink>
);
