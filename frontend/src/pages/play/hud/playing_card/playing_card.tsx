import "./playing_card.css";

import type { PlayerCard } from "#api_types/game.types";

import { Image } from "@mantine/core";
import clsx from "clsx";
import type { CSSProperties } from "react";

interface CardProps {
    card: PlayerCard;
    isOpponent?: boolean;
    style?: CSSProperties;
}

export const PlayingCard = ({ card, isOpponent, style }: CardProps) => {
    if (card.type !== "MINION") return <p>Card type {card.type} not supported</p>;

    return (
        <div
            key={card.uuid}
            style={style}
            className={clsx("w-[120px] h-[150px] rounded bg-[#1e3a5f]")}
        >
            {!isOpponent && (
                <>
                    <div>
                        <div className="cost">{card.cost}</div>
                        <Image
                            className="rounded-t"
                            src={card.imageUrl}
                            height={75}
                            alt="Galaguerre card"
                        />
                    </div>
                    <div className="flex flex-col h-[75px] justify-around">
                        <p className="text-center text-white m-0">{card.label}</p>
                        <div className="flex justify-between mx-1">
                            <div className="attack">{card.attack}</div>
                            <div className="health">{card.health}</div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
