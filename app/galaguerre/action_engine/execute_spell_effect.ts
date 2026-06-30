import type { ActionTarget, GamePlayer, SpellCard } from "#api_types/game.types";
import type Game from "#models/game";
import { executeActionSequence } from "./execute_action_sequence.js";

const getOpponent = (game: Game, player: GamePlayer): GamePlayer => {
    return player === game.data.playerOne ? game.data.playerTwo : game.data.playerOne;
};

export const executeSpellEffect = (
    game: Game,
    player: GamePlayer,
    card: SpellCard,
    selectedTarget?: ActionTarget,
): { gameEnded: boolean; discoverPending: boolean } => {
    const opponent = getOpponent(game, player);

    return executeActionSequence(game, player, opponent, card.spellActions, {
        sourceCard: { cardId: card.cardId, label: card.label, uuid: card.uuid },
        effectKind: "SPELL",
        selectedTarget,
        damageBonus: player.spellPower,
    });
};
