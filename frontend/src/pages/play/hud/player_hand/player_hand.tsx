import "./player_hand.css";

import type { GamePlayer } from "#api_types/game.types";

import { PlayingCard } from "../playing_card/playing_card.jsx";

export const PlayerHand = ({
    player,
    isOpponent,
}: { player: GamePlayer; isOpponent?: boolean }) => {
    const className = isOpponent ? "opponent-hand" : "player-hand";

    return (
        <div className={`${className} card-hand`}>
            {player.hand.map((card, index) => {
                const isLastCard = index === player.hand.length - 1;
                const isFirstCard = index === 0;
                const totalCards = player.hand.length;
                let rotation = (index - (totalCards - 1) / 2) * 2;
                let translationY = Math.abs(index - (totalCards - 1) / 2) * 4;

                if (isFirstCard || isLastCard) {
                    translationY += 10;
                    if (totalCards > 8) {
                        translationY += 10;
                    }
                }

                if (isOpponent) {
                    rotation *= -1;
                    translationY *= -1;
                }

                return (
                    <PlayingCard
                        style={{
                            rotate: `${rotation}deg`,
                            transform: `translate(0px, ${translationY}px)`,
                        }}
                        key={card.uuid}
                        card={card}
                        isOpponent={isOpponent}
                    />
                );
            })}
        </div>
    );
};
