import "./player_hand.css";

import type { GamePlayer } from "#api_types/game.types";

import { observer } from "mobx-react-lite";
import { PlayingCard } from "../playing_card/playing_card.jsx";
import { MobilePlayerHand } from "./mobile_player_hand.jsx";

interface PlayerHandProps {
    player: GamePlayer;
    isOpponent?: boolean;
    isMobile?: boolean;
}

export const PlayerHand = observer<PlayerHandProps>(({ player, isOpponent, isMobile }) => {
    if (isMobile && !isOpponent) {
        return <MobilePlayerHand player={player} />;
    }

    const className = isMobile
        ? "card-hand card-hand--mobile"
        : isOpponent
          ? "opponent-hand card-hand"
          : "player-hand card-hand";
    const animationOwner = isOpponent ? "OPPONENT" : "PLAYER";

    const rotationFactor = isMobile ? 1.5 : 2;
    const translationFactor = isMobile ? 2 : 4;

    return (
        <div
            className={className}
            data-animation-hand
            data-animation-owner={animationOwner}
            {...(!isOpponent ? { "data-player-hand": true } : {})}
        >
            {player.hand.map((card, index) => {
                const isLastCard = index === player.hand.length - 1;
                const isFirstCard = index === 0;
                const totalCards = player.hand.length;
                let rotation = (index - (totalCards - 1) / 2) * rotationFactor;
                let translationY = Math.abs(index - (totalCards - 1) / 2) * translationFactor;

                if (isFirstCard || isLastCard) {
                    translationY += isMobile ? 4 : 10;
                    if (totalCards > 8) {
                        translationY += isMobile ? 4 : 10;
                    }
                }

                if (isOpponent) {
                    rotation *= -1;
                    translationY *= -1;
                }

                return (
                    <div
                        key={card.uuid}
                        className="card-hand__card"
                        style={{
                            rotate: `${rotation}deg`,
                            transform: `translate(0px, ${translationY}px)`,
                        }}
                    >
                        <PlayingCard
                            card={card}
                            isOpponent={isOpponent}
                            showDetailButton={isMobile && !isOpponent}
                        />
                    </div>
                );
            })}
        </div>
    );
});
