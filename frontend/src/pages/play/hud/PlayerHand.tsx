import type { GamePlayer } from "#api_types/game.types";
import { Card } from "./Card.jsx";

import "./player_hand.css";

export const PlayerHand = ({
    player,
    isOpponent,
}: { player: GamePlayer; isOpponent?: boolean }) => {
    const className = isOpponent ? "opponent-hand" : "player-hand";

    return (
        <div className={`${className} card-hand`}>
            {player.deckCards.map((card) => (
                <Card key={card.uuid} card={card} isOpponent={isOpponent} />
            ))}
        </div>
    );
};
