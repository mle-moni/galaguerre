import type { ActionTarget, SpellCard } from "#api_types/game.types";
import { executeSpellEffect } from "../../../galaguerre/action_engine/execute_spell_effect.js";
import { isCoinCard } from "../../../galaguerre/coin.js";
import { recordPlayCard } from "../../../galaguerre/game_log/record_game_log.js";
import {
    recordManaSpent,
    recordSpellCast,
} from "../../../galaguerre/game_stats/record_player_stats.js";
import { cardRequiresActionTarget } from "../../../galaguerre/action_engine/requires_action_target.js";
import { validateSelectedTargetForAction } from "../../../galaguerre/action_engine/validate_selected_target.js";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import { sendGameUpdate } from "../send_game_update.js";
import { terminateGame } from "../terminate_game.js";
import type { PlayCardOptions } from "./game_play_card.js";

interface PlaySpellOptions extends Omit<PlayCardOptions, "card"> {
    card: SpellCard;
    actionTarget?: ActionTarget | null;
}

const getOpponent = (game: PlayCardOptions["game"], player: PlayCardOptions["player"]) => {
    return player === game.data.playerOne ? game.data.playerTwo : game.data.playerOne;
};

export const playSpell = async ({
    card,
    player,
    game,
    socketId,
    actionTarget,
}: PlaySpellOptions) => {
    if (isCoinCard(card)) {
        player.hand = player.hand.filter((handCard) => handCard.uuid !== card.uuid);
        recordPlayCard(game, player, card);
        player.mana += 1;
        recordSpellCast(player);

        await game.save();
        sendGameUpdate(game);
        return;
    }

    const requiresTarget = cardRequiresActionTarget(card);
    const opponent = getOpponent(game, player);

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

    if (
        actionTarget &&
        !validateSelectedTargetForAction(actionTarget, card.action, player, opponent)
    ) {
        emitSocketEvent("notify_error", { error: "Cible invalide pour cette carte" }, socketId);
        return;
    }

    player.hand = player.hand.filter((handCard) => handCard.uuid !== card.uuid);
    recordPlayCard(game, player, card);
    player.mana -= card.cost;
    recordManaSpent(player, card.cost);
    recordSpellCast(player);

    const { gameEnded } = executeSpellEffect(game, player, card, actionTarget ?? undefined);

    if (gameEnded) {
        await terminateGame(game);
        return;
    }

    await game.save();

    sendGameUpdate(game);
};
