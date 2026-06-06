import type { GamePlayer } from "#api_types/game.types";

export const getFatigueDamage = (player: GamePlayer) => player.maxFatigueDamageTaken + 1;

export const drawOneCard = (player: GamePlayer): void => {
    const card = player.deckCards.shift();
    if (!card) {
        const fatigueDamage = getFatigueDamage(player);
        player.health -= fatigueDamage;
        player.maxFatigueDamageTaken = fatigueDamage;
    } else {
        player.hand.push(card);
    }
};

export const drawCards = (player: GamePlayer, count: number): void => {
    for (let i = 0; i < count; i++) drawOneCard(player);
};
