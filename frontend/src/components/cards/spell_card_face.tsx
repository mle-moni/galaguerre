import "./card_faces.css";

import type { SpellCard } from "#api_types/game.types";
import { Image } from "@mantine/core";
import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";

interface SpellCardFaceProps {
    card: SpellCard;
    className?: string;
    style?: CSSProperties;
    onClick?: () => void;
    wrapper?: (content: ReactNode) => ReactNode;
}

export const SpellCardFace = ({
    card,
    className,
    style,
    onClick,
    wrapper = (content) => content,
}: SpellCardFaceProps) => {
    const content = (
        <div
            style={style}
            className={clsx("relative w-[120px] h-[150px] rounded bg-[#4a1e5f]", className)}
            onClick={onClick}
        >
            <div className="relative">
                <div className="cost">{card.cost}</div>
                <Image
                    className="rounded-t"
                    src={card.imageUrl}
                    height={75}
                    alt="Galaguerre spell"
                    draggable={false}
                />
            </div>
            <div className="flex flex-col h-[75px] justify-center">
                <p className="text-center text-white m-0 text-xs px-1">{card.label}</p>
            </div>
        </div>
    );

    return <>{wrapper(content)}</>;
};
