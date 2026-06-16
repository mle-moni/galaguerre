import type { GamePlayer, MinionCard, PlayerCard } from "#api_types/game.types";
import type Game from "#models/game";
import { collectPassiveTriggers } from "./collect_passive_triggers.js";
import { executePassiveActions } from "./execute_passive_actions.js";

export const triggerSummonPassives = (
    game: Game,
    summoningPlayer: GamePlayer,
    summonedCard: PlayerCard,
): { gameEnded: boolean } => {
    const entries = collectPassiveTriggers(game, "SUMMON", summoningPlayer, summonedCard);
    return executePassiveActions(game, entries);
};

export const triggerSummonPassivesForCards = (
    game: Game,
    summoningPlayer: GamePlayer,
    summonedCards: MinionCard[],
): { gameEnded: boolean } => {
    for (const summonedCard of summonedCards) {
        const { gameEnded } = triggerSummonPassives(game, summoningPlayer, summonedCard);
        if (gameEnded) {
            return { gameEnded: true };
        }
    }

    return { gameEnded: false };
};
