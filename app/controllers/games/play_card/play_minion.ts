import type { ActionTarget, MinionCard, MinionSpotId } from "#api_types/game.types";
import { executeBattlecries } from "../../../galaguerre/action_engine/execute_battlecries.js";
import { refreshAurasAfterMinionPlayed } from "../../../galaguerre/passive_engine/refresh_passive_auras.js";
import { triggerPlayCardPassives } from "../../../galaguerre/passive_engine/trigger_play_card_passives.js";
import { recordPlayCard } from "../../../galaguerre/game_log/record_game_log.js";
import {
    recordManaSpent,
    recordMinionPlayed,
} from "../../../galaguerre/game_stats/record_player_stats.js";
import { cardRequiresActionTarget } from "../../../galaguerre/action_engine/requires_action_target.js";
import { validateSelectedTargetForAction } from "../../../galaguerre/action_engine/validate_selected_target.js";
import { cardHasPlayableTarget } from "#api_types/target_matching";
import { computeEffectiveCost } from "../../../galaguerre/dynamic_cost/compute_effective_cost.js";
import { playerHasBoardSpace } from "../../../galaguerre/action_engine/apply_mind_control.js";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import { sendGameUpdate } from "../send_game_update.js";
import { terminateGame } from "../terminate_game.js";
import type { PlayCardOptions } from "./game_play_card.js";
import { instantiateMinion } from "./instantiate_minion.js";

interface PlayMinionOptions extends Omit<PlayCardOptions, "card" | "spotId"> {
    card: MinionCard;
    spotId: MinionSpotId;
    actionTarget?: ActionTarget | null;
}

const getOpponent = (game: PlayCardOptions["game"], player: PlayCardOptions["player"]) => {
    return player === game.data.playerOne ? game.data.playerTwo : game.data.playerOne;
};

const validateActionTargetForCard = (
    card: MinionCard,
    actionTarget: ActionTarget,
    player: PlayCardOptions["player"],
    opponent: PlayCardOptions["player"],
): boolean => {
    const targetedActions = (card.battlecryActions ?? []).filter((action) => action.isTargeted);

    return targetedActions.every((action) =>
        validateSelectedTargetForAction(actionTarget, action, player, opponent),
    );
};

export const playMinion = async ({
    card,
    spotId,
    owner,
    player,
    game,
    socketId,
    actionTarget,
}: PlayMinionOptions) => {
    const spotIsEmpty = player.board[spotId] === null;
    if (owner === "OPPONENT" || !spotIsEmpty) {
        emitSocketEvent(
            "notify_error",
            { error: "Vous ne pouvez pas jouer cette carte ici" },
            socketId,
        );
        return;
    }

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

    player.board[spotId] = instantiateMinion(card, game.data.currentRound);
    player.hand = player.hand.filter((handCard) => handCard.uuid !== card.uuid);
    recordPlayCard(game, player, card);
    player.mana -= effectiveCost;
    recordManaSpent(player, effectiveCost);
    recordMinionPlayed(player);

    refreshAurasAfterMinionPlayed(game, player, spotId);

    const { gameEnded: battlecryGameEnded } = executeBattlecries(
        game,
        player,
        card,
        actionTarget ?? undefined,
    );

    if (battlecryGameEnded) {
        await terminateGame(game);
        return;
    }

    const { gameEnded: playCardPassiveGameEnded } = triggerPlayCardPassives(game, player, card);

    if (playCardPassiveGameEnded) {
        await terminateGame(game);
        return;
    }

    await game.save();

    sendGameUpdate(game);
};
