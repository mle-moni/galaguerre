import "./playing_card.css";

import type { PlayerCard } from "#api_types/game.types";

import { Image } from "@mantine/core";

interface CardProps {
    card: PlayerCard;
    isOpponent?: boolean;
}

export const PlayingCard = ({ card, isOpponent }: CardProps) => {
    if (card.type !== "MINION") return <p>Card type {card.type} not supported</p>;

    return (
        <div key={card.uuid} className="w-[120px] h-[150px] rounded bg-[#1e3a5f]">
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
                        <div className="flex justify-between mx-2">
                            <div className="attack">{card.attack}</div>
                            <div className="health">{card.health}</div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
