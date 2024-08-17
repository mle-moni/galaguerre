import "./playing_card.css";

import type { PlayerCard } from "#api_types/game.types";

interface CardProps {
    card: PlayerCard;
    isOpponent?: boolean;
}

export const PlayingCard = ({ card, isOpponent }: CardProps) => {
    if (card.type !== "MINION") return <p>Card type {card.type} not supported</p>;

    return (
        <div className="card" draggable>
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
