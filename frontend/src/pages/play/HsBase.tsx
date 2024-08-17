import type { ApiUser } from "#api_types/auth.types";
import type { ApiGame } from "#api_types/game.types";
import { Container, Sprite, Stage, Text } from "@pixi/react";
import * as PIXI from "pixi.js";
import { useMemo } from "react";

const cardWidth = 100;
const cardHeight = 150;
const spacing = 20;
const playerHandY = 50;
const opponentHandY = 400;

interface CardProps {
    x: number;
    y: number;
    texture: PIXI.Texture;
}

const Card = ({ x, y, texture }: CardProps) => (
    <Sprite texture={texture} x={x} y={y} width={cardWidth} height={cardHeight} />
);

export const HsBase = ({ game, user }: { game: ApiGame; user: ApiUser }) => {
    // const cardTexture = PIXI.Texture.from("https://via.placeholder.com/100x150"); // Replace with your card image
    const textureMap = useMemo(() => {
        const map = new Map<number, PIXI.Texture>();
        const cards = game.data.playerOne.deckCards.concat(game.data.playerTwo.deckCards);

        cards.forEach((card) => {
            if (map.has(card.cardId)) return;
            map.set(card.cardId, PIXI.Texture.from(card.imageUrl));
        });

        return map;
    }, [game]);

    const me = game.data.playerOne.userId === user.id ? game.data.playerOne : game.data.playerTwo;
    const opponent =
        game.data.playerOne.userId === user.id ? game.data.playerTwo : game.data.playerOne;

    return (
        <Stage width={800} height={600} options={{ backgroundColor: 0x1099bb }}>
            <Container>
                {/* Opponent's Hand */}
                {me.deckCards.map(({ uuid, cardId }, index) => (
                    <Card
                        key={uuid}
                        x={spacing + index * (cardWidth + spacing)}
                        y={playerHandY}
                        texture={textureMap.get(cardId)!}
                    />
                ))}

                {/* Player's Hand */}
                {opponent.deckCards.map(({ uuid, cardId }, index) => (
                    <Card
                        key={uuid}
                        x={spacing + index * (cardWidth + spacing)}
                        y={opponentHandY}
                        texture={textureMap.get(cardId)!}
                    />
                ))}

                {/* Example text, such as player's name */}
                <Text text={opponent.pseudo} x={350} y={10} />
                <Text text={me.pseudo} x={350} y={550} />
            </Container>
        </Stage>
    );
};
