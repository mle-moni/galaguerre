import type { ActionTarget, SpellCard, SpotOwner } from "#api_types/game.types";
import { executeSpellEffect } from "../../../galaguerre/action_engine/execute_spell_effect.js";
import { triggerPlayCardPassives } from "../../../galaguerre/passive_engine/trigger_play_card_passives.js";
import { recordPlayCard } from "../../../galaguerre/game_log/record_game_log.js";
import {
    recordManaSpent,
    recordSpellCast,
} from "../../../galaguerre/game_stats/record_player_stats.js";
import { cardRequiresActionTarget } from "../../../galaguerre/action_engine/requires_action_target.js";
import { validateSelectedTargetForAction } from "../../../galaguerre/action_engine/validate_selected_target.js";
import { cardHasPlayableTarget } from "#api_types/target_matching";
import {
    computeEffectiveCost,
    clearNextSpellCostReduction,
    refreshGameDynamicCosts,
} from "../../../galaguerre/dynamic_cost/compute_effective_cost.js";
import { playerHasBoardSpace } from "../../../galaguerre/action_engine/apply_mind_control.js";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import {
    beginLoggedBeat,
    endCurrentBeat,
} from "../../../galaguerre/game_narrative/narrative_beats.js";
import { withNarrativeRecorder } from "../../../galaguerre/game_narrative/narrative_context.js";
import { runGameActionWithNarrative } from "../../../galaguerre/game_narrative/run_game_action_with_narrative.js";
import { terminateGame } from "../terminate_game.js";
import type { PlayCardOptions } from "./game_play_card.js";

interface PlaySpellOptions extends Omit<PlayCardOptions, "card"> {
    card: SpellCard;
    actionTarget?: ActionTarget | null;
}

const getOpponent = (game: PlayCardOptions["game"], player: PlayCardOptions["player"]) => {
    return player === game.data.playerOne ? game.data.playerTwo : game.data.playerOne;
};

const resolvePlayerOwner = (
    game: PlayCardOptions["game"],
    player: PlayCardOptions["player"],
): SpotOwner => (player === game.data.playerOne ? "PLAYER" : "OPPONENT");

const validateActionTargetForCard = (
    card: SpellCard,
    actionTarget: ActionTarget,
    player: PlayCardOptions["player"],
    opponent: PlayCardOptions["player"],
): boolean => {
    const targetedActions = card.spellActions.filter((action) => action.isTargeted);

    return targetedActions.every((action) =>
        validateSelectedTargetForAction(actionTarget, action, player, opponent),
    );
};

export const playSpell = async ({
    card,
    player,
    game,
    socketId,
    actionTarget,
}: PlaySpellOptions) => {
    const requiresTarget = cardRequiresActionTarget(card);
    const opponent = getOpponent(game, player);

    if (
        requiresTarget &&
        !cardHasPlayableTarget(card, player.board, opponent.board, playerHasBoardSpace(player))
    ) {
        emitSocketEvent(
            "notify_error",
            { error: "Aucune cible valide pour cette carte" },
            socketId,
        );
        return;
    }

    if (requiresTarget && !actionTarget) {
        emitSocketEvent(
            "notify_error",
            { error: "Vous devez choisir une cible pour cette carte" },
            socketId,
        );
        return;
    }

    if (!requiresTarget && actionTarget) {
        emitSocketEvent(
            "notify_error",
            { error: "Cette carte ne nécessite pas de cible" },
            socketId,
        );
        return;
    }

    if (actionTarget && !validateActionTargetForCard(card, actionTarget, player, opponent)) {
        emitSocketEvent("notify_error", { error: "Cible invalide pour cette carte" }, socketId);
        return;
    }

    const effectiveCost = computeEffectiveCost(card, player, opponent);
    card.cost = effectiveCost;
    const hadSpellCostReduction = (player.nextSpellCostReduction ?? 0) > 0;
    clearNextSpellCostReduction(player);
    if (hadSpellCostReduction) {
        refreshGameDynamicCosts(game.data);
    }
    const spotOwner = resolvePlayerOwner(game, player);

    await runGameActionWithNarrative(game, async () => {
        player.hand = player.hand.filter((handCard) => handCard.uuid !== card.uuid);
        recordPlayCard(game, player, card);
        player.mana -= effectiveCost;
        recordManaSpent(player, effectiveCost);
        recordSpellCast(player);

        withNarrativeRecorder((recorder) => {
            beginLoggedBeat(game, "PLAY_CARD");
            recorder.recordEffect({
                type: "MOVE_CARD",
                cardUuid: card.uuid,
                owner: spotOwner,
                from: "HAND",
                to: { type: "DISCARD" },
            });
            recorder.recordEffect({ type: "SPEND_MANA", owner: spotOwner, amount: effectiveCost });
        });

        const { gameEnded: spellGameEnded, discoverPending } = executeSpellEffect(
            game,
            player,
            card,
            actionTarget ?? undefined,
        );

        endCurrentBeat(game);

        if (spellGameEnded) {
            await terminateGame(game, { skipSendUpdate: true });
            return;
        }

        if (discoverPending) return;

        const { gameEnded: playCardPassiveGameEnded } = triggerPlayCardPassives(game, player, card);

        if (playCardPassiveGameEnded) {
            await terminateGame(game, { skipSendUpdate: true });
        }
    });
};
