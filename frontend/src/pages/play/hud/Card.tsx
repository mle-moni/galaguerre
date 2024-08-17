import type { PlayerCard } from "#api_types/game.types";

import "./card.css";

interface CardProps {
    card: PlayerCard;
    isOpponent?: boolean;
}

export const Card = ({ card, isOpponent }: CardProps) => {
    if (card.type !== "MINION") return <p>Card type {card.type} not supported</p>;

    return (
        <div className="card">
            {!isOpponent && (
                <>
                    <div className="cost">{card.cost}</div>
                    <div className="image">
                        <img src={card.imageUrl} alt="Galaguerre card" />
                    </div>
                    <div className="stats">
                        <div className="attack">{card.attack}</div>
                        <div className="health">{card.health}</div>
                    </div>
                </>
            )}
        </div>
    );
};
