import "./player_hand.css";

import type { GamePlayer } from "#api_types/game.types";
import { PlayingCard } from "./playing_card.js";

export const PlayerHand = ({
    player,
    isOpponent,
}: { player: GamePlayer; isOpponent?: boolean }) => {
    const className = isOpponent ? "opponent-hand" : "player-hand";

    return (
        <div className={`${className} card-hand`}>
            {player.hand.map((card) => (
                <PlayingCard key={card.uuid} card={card} isOpponent={isOpponent} />
            ))}
        </div>
    );
};
