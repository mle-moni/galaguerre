import type { CardFilterSnapshot, GamePlayer } from "#api_types/game.types";
import { deckCardMatchesFilter } from "#api_types/card_filter_matching";
import type Game from "#models/game";
import { triggerPassives } from "./passive_engine/trigger_passives.js";

export const getFatigueDamage = (player: GamePlayer) => player.maxFatigueDamageTaken + 1;

const triggerDrawPassives = (game: Game | undefined, drawingPlayer: GamePlayer): void => {
    if (!game) return;
    triggerPassives(game, "DRAW", drawingPlayer);
};

export const drawOneCard = (
    player: GamePlayer,
    filter?: CardFilterSnapshot | null,
    game?: Game,
): void => {
    if (!filter) {
        const card = player.deckCards.shift();
        if (!card) {
            const fatigueDamage = getFatigueDamage(player);
            player.health -= fatigueDamage;
            player.maxFatigueDamageTaken = fatigueDamage;
        } else {
            player.hand.push(card);
            triggerDrawPassives(game, player);
        }
        return;
    }

    if (player.deckCards.length === 0) {
        const fatigueDamage = getFatigueDamage(player);
        player.health -= fatigueDamage;
        player.maxFatigueDamageTaken = fatigueDamage;
        return;
    }

    const matchIndex = player.deckCards.findIndex((card) => deckCardMatchesFilter(card, filter));
    if (matchIndex === -1) return;

    const [card] = player.deckCards.splice(matchIndex, 1);
    player.hand.push(card!);
    triggerDrawPassives(game, player);
};

export const drawCards = (
    player: GamePlayer,
    count: number,
    filter?: CardFilterSnapshot | null,
    game?: Game,
): void => {
    for (let i = 0; i < count; i++) drawOneCard(player, filter, game);
};
