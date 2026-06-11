import type { ActionTarget, GameData, SpellCard } from "#api_types/game.types";
import type Game from "#models/game";
import { executeSpellEffect } from "#galaguerre/action_engine/execute_spell_effect";
import { createInMemoryGame } from "./in_memory_game.js";

export type PlayerKey = "playerOne" | "playerTwo";

export interface SpellEffectRunOptions {
    actionTarget?: ActionTarget;
    actor?: PlayerKey;
}

export const runSpellEffect = (
    data: GameData,
    card: SpellCard,
    options: SpellEffectRunOptions = {},
): { game: Game; gameEnded: boolean } => {
    const actor = options.actor ?? "playerOne";
    const game = createInMemoryGame(data);
    const player = game.data[actor];

    const { gameEnded } = executeSpellEffect(game, player, card, options.actionTarget);

    if (gameEnded) {
        game.isFinished = true;
        game.data.state = "FINISHED";
    }

    return { game, gameEnded };
};
