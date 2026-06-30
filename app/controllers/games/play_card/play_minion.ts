import type { ActionTarget, MinionCard, SpotOwner } from "#api_types/game.types";
import { countBoardMinionsOnBoard, MAX_BOARD_MINIONS } from "#api_types/board";
import { executeBattlecries } from "../../../galaguerre/action_engine/execute_battlecries.js";
import { insertMinionOnBoard } from "../../../galaguerre/action_engine/summon_minion.js";
import { triggerSummonPassives } from "../../../galaguerre/passive_engine/trigger_summon_passives.js";
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
import {
    beginLoggedBeat,
    endCurrentBeat,
} from "../../../galaguerre/game_narrative/narrative_beats.js";
import { withNarrativeRecorder } from "../../../galaguerre/game_narrative/narrative_context.js";
import { runGameActionWithNarrative } from "../../../galaguerre/game_narrative/run_game_action_with_narrative.js";
import { terminateGame } from "../terminate_game.js";
import type { PlayCardOptions } from "./game_play_card.js";

interface PlayMinionOptions extends Omit<PlayCardOptions, "card" | "boardIndex"> {
    card: MinionCard;
    boardIndex: number;
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

const isValidBoardIndex = (boardIndex: number, minionCount: number): boolean => {
    return Number.isInteger(boardIndex) && boardIndex >= 0 && boardIndex <= minionCount;
};

const resolvePlayerOwner = (
    game: PlayCardOptions["game"],
    player: PlayCardOptions["player"],
): SpotOwner => (player === game.data.playerOne ? "PLAYER" : "OPPONENT");

export const playMinion = async ({
    card,
    boardIndex,
    owner,
    player,
    game,
    socketId,
    actionTarget,
}: PlayMinionOptions) => {
    const minionCount = countBoardMinionsOnBoard(player.board);

    if (
        owner === "OPPONENT" ||
        !isValidBoardIndex(boardIndex, minionCount) ||
        minionCount >= MAX_BOARD_MINIONS
    ) {
        emitSocketEvent(
            "notify_error",
            { error: "Vous ne pouvez pas jouer cette carte ici" },
            socketId,
        );
        return;
    }

    const requiresTarget = cardRequiresActionTarget(card);
    const opponent = getOpponent(game, player);
    const hasPlayableTarget = cardHasPlayableTarget(
        card,
        player.board,
        opponent.board,
        playerHasBoardSpace(player),
    );

    if (requiresTarget && hasPlayableTarget && !actionTarget) {
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
    const spotOwner = resolvePlayerOwner(game, player);

    await runGameActionWithNarrative(game, async () => {
        const { inserted } = insertMinionOnBoard(game, player, boardIndex, card);
        if (!inserted) {
            emitSocketEvent(
                "notify_error",
                { error: "Vous ne pouvez pas jouer cette carte ici" },
                socketId,
            );
            return;
        }

        player.hand = player.hand.filter((handCard) => handCard.uuid !== card.uuid);
        recordPlayCard(game, player, card);
        player.mana -= effectiveCost;
        recordManaSpent(player, effectiveCost);
        recordMinionPlayed(player);

        beginLoggedBeat(game, "PLAY_CARD");
        withNarrativeRecorder((recorder) => {
            recorder.recordEffect({
                type: "MOVE_CARD",
                cardUuid: card.uuid,
                owner: spotOwner,
                from: "HAND",
                to: { type: "BOARD", owner: spotOwner, boardIndex },
            });
            recorder.recordEffect({ type: "SPEND_MANA", owner: spotOwner, amount: effectiveCost });
        });
        endCurrentBeat(game);

        const { gameEnded: battlecryGameEnded, discoverPending } = executeBattlecries(
            game,
            player,
            card,
            actionTarget ?? undefined,
        );

        if (battlecryGameEnded) {
            await terminateGame(game, { skipSendUpdate: true });
            return;
        }

        if (discoverPending) return;

        const { gameEnded: summonPassiveGameEnded } = triggerSummonPassives(game, player, card);

        if (summonPassiveGameEnded) {
            await terminateGame(game, { skipSendUpdate: true });
        }
    });
};
