import type { MinionCard } from "#api_types/game.types";
import { Image } from "@mantine/core";
import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";
import { CardEffectSymbols } from "./card_effect_symbols.jsx";

interface MinionCardFaceProps {
    card: MinionCard;
    attack: number;
    health: number;
    className?: string;
    style?: CSSProperties;
    draggable?: boolean;
    onDragStart?: () => void;
    onDragEnd?: () => void;
    wrapper?: (content: ReactNode) => ReactNode;
}

export const MinionCardFace = ({
    card,
    attack,
    health,
    className,
    style,
    draggable,
    onDragStart,
    onDragEnd,
    wrapper = (content) => content,
}: MinionCardFaceProps) => {
    const content = (
        <div
            style={style}
            className={clsx("relative w-[120px] h-[150px] rounded bg-[#1e3a5f]", className)}
            draggable={draggable}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
        >
            <CardEffectSymbols card={card} />
            <div className="relative">
                <div className="cost">{card.cost}</div>
                <Image
                    className="rounded-t"
                    src={card.imageUrl}
                    height={75}
                    alt="Galaguerre card"
                    draggable={false}
                />
            </div>
            <div className="flex flex-col h-[75px] justify-around">
                <p className="text-center text-white m-0 text-xs px-1">{card.label}</p>
                <div className="flex justify-between mx-1">
                    <div className="attack">{attack}</div>
                    <div className="health">{health}</div>
                </div>
            </div>
        </div>
    );

    return <>{wrapper(content)}</>;
};
