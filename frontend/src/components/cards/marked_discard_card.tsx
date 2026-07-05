import type { ReactNode } from "react";
import clsx from "clsx";
import "./marked_discard_card.css";

type MarkedDiscardCardProps = {
    bannerText: string;
    children: ReactNode;
    className?: string;
};

export const MarkedDiscardCard = ({ bannerText, children, className }: MarkedDiscardCardProps) => {
    return (
        <div className={clsx("marked-discard-card", className)}>
            <span className="marked-discard-card__banner">{bannerText}</span>
            {children}
            <div className="marked-discard-card__mark" aria-hidden />
        </div>
    );
};
