import type { GamePlayer, MinionPosition, MinionState, SpotOwner } from "#api_types/game.types";
import type Game from "#models/game";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import { recordAttack } from "../../../galaguerre/game_log/record_game_log.js";
import {
    applyDamageToMinion,
    applyPoisonousToMinion,
} from "../../../galaguerre/action_engine/apply_damage_to_minion.js";
import { requireMinionIndex } from "../../../galaguerre/action_engine/find_minion_on_board.js";
import {
    ensureValidAttackTarget,
    getMinionIsPoisonous,
    recordMinionAttack,
} from "../game_utils.js";
import { sendGameUpdate } from "../send_game_update.js";
import { terminateGame } from "../terminate_game.js";

export interface MinionActionOptions {
    minionInfos: MinionPosition;
    game: Game;
    player: GamePlayer;
    opponent: GamePlayer;
    owner: SpotOwner;
    targetMinion: MinionState;
    socketId: string;
}

export const minionToMinionAction = async ({
    minionInfos,
    opponent,
    targetMinion,
    owner,
    player,
    game,
    socketId,
}: MinionActionOptions) => {
    if (owner === "PLAYER") {
        emitSocketEvent(
            "notify_error",
            {
                error: "J'aurai pu te laisser attaquer ton propre serviteur mais j'ai décidé d'être clément...",
            },
            socketId,
        );
        return;
    }

    const isValidTarget = ensureValidAttackTarget(opponent.board, owner, targetMinion, socketId);
    if (!isValidTarget) return;

    const targetBoardIndex = requireMinionIndex(opponent, targetMinion);
    if (targetBoardIndex === -1) {
        emitSocketEvent(
            "notify_error",
            { error: "Vous ne pouvez pas jouer ce serviteur ici" },
            socketId,
        );
        return;
    }

    const attacker = minionInfos.minion;

    recordAttack(game, player, attacker.originalCard, {
        type: "MINION",
        card: targetMinion.originalCard,
    });

    const targetIsPoisonous = getMinionIsPoisonous(targetMinion);
    const attackerIsPoisonous = getMinionIsPoisonous(attacker);

    const initiatorOwner = minionInfos.position.owner === "PLAYER" ? player : opponent;
    const targetOwner = opponent;
    const attackerBoardIndex = requireMinionIndex(initiatorOwner, attacker);
    if (attackerBoardIndex === -1) return;

    if (targetIsPoisonous) {
        const retaliationResult = applyPoisonousToMinion(
            game,
            initiatorOwner,
            attackerBoardIndex,
            attacker,
            opponent,
        );
        if (retaliationResult.gameEnded) {
            await terminateGame(game);
            return;
        }
    } else {
        const retaliationResult = applyDamageToMinion(
            game,
            initiatorOwner,
            attackerBoardIndex,
            attacker,
            targetMinion.attack,
            opponent,
        );
        if (retaliationResult.gameEnded) {
            await terminateGame(game);
            return;
        }
    }

    const currentTargetBoardIndex = requireMinionIndex(targetOwner, targetMinion);
    if (currentTargetBoardIndex === -1) {
        recordMinionAttack(minionInfos.minion, game.data.currentRound);
        await game.save();
        sendGameUpdate(game);
        return;
    }

    if (attackerIsPoisonous) {
        const attackResult = applyPoisonousToMinion(
            game,
            targetOwner,
            currentTargetBoardIndex,
            targetMinion,
            player,
        );
        if (attackResult.gameEnded) {
            await terminateGame(game);
            return;
        }
    } else {
        const attackResult = applyDamageToMinion(
            game,
            targetOwner,
            currentTargetBoardIndex,
            targetMinion,
            attacker.attack,
            player,
        );
        if (attackResult.gameEnded) {
            await terminateGame(game);
            return;
        }
    }

    recordMinionAttack(minionInfos.minion, game.data.currentRound);

    await game.save();

    sendGameUpdate(game);
};
