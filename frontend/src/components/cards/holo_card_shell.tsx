import type { CardRarity } from "#api_types/card_rarity.types";
import clsx from "clsx";
import { useRef, type CSSProperties, type ReactNode } from "react";
import { usePointerCardTilt } from "~/hooks/use_pointer_card_tilt";
import "./holo_card_shell.css";

export type HoloCardTier = "common" | "rare" | "epic" | "legendary" | "golden";

export const resolveHoloTier = (rarity: CardRarity, isGolden: boolean): HoloCardTier => {
    if (isGolden) return "golden";
    switch (rarity) {
        case "RARE":
            return "rare";
        case "EPIC":
            return "epic";
        case "LEGENDARY":
            return "legendary";
        default:
            return "common";
    }
};

interface HoloCardShellProps {
    rarity: CardRarity;
    isGolden?: boolean;
    children: ReactNode;
    className?: string;
    style?: CSSProperties;
}

export const HoloCardShell = ({
    rarity,
    isGolden = false,
    children,
    className,
    style,
}: HoloCardShellProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const tier = resolveHoloTier(rarity, isGolden);
    const tilt = usePointerCardTilt(containerRef);

    return (
        <div
            ref={containerRef}
            className={clsx("holo-card-shell", `holo-card-shell--${tier}`, className)}
            style={{ ...tilt.style, ...style }}
            onPointerMove={tilt.onPointerMove}
            onPointerLeave={tilt.onPointerLeave}
        >
            <div className="holo-card-shell__card">
                {children}
                <div className="holo-card-shell__foil" aria-hidden="true" />
                <div className="holo-card-shell__glare" aria-hidden="true" />
            </div>
        </div>
    );
};
