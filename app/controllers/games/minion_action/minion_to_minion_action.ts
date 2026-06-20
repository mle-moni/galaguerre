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
    beginLoggedBeat,
    endCurrentBeat,
} from "../../../galaguerre/game_narrative/narrative_beats.js";
import { minionEntityRef } from "../../../galaguerre/game_narrative/narrative_effects.js";
import { withNarrativeRecorder } from "../../../galaguerre/game_narrative/narrative_context.js";
import { runGameActionWithNarrative } from "../../../galaguerre/game_narrative/run_game_action_with_narrative.js";
import {
    ensureValidAttackTarget,
    getMinionIsPoisonous,
    recordMinionAttack,
} from "../game_utils.js";
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

    await runGameActionWithNarrative(game, async () => {
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

        const attackerSpotOwner = minionInfos.position.owner;
        const targetSpotOwner = owner;

        beginLoggedBeat(game, "ATTACK");
        withNarrativeRecorder((recorder) => {
            recorder.recordEffect({
                type: "ATTACK_LUNGE",
                attackerCardUuid: attacker.uuid,
                attackerOwner: attackerSpotOwner,
                target: minionEntityRef(targetMinion, targetSpotOwner),
            });
        });

        if (targetIsPoisonous) {
            withNarrativeRecorder((recorder) => {
                recorder.recordEffect({
                    type: "COMBAT_DAMAGE",
                    sourceCardUuid: targetMinion.uuid,
                    target: minionEntityRef(attacker, attackerSpotOwner),
                    amount: attacker.health,
                });
            });
            const retaliationResult = applyPoisonousToMinion(
                game,
                initiatorOwner,
                attackerBoardIndex,
                attacker,
                opponent,
            );
            if (retaliationResult.gameEnded) {
                endCurrentBeat(game);
                await terminateGame(game, { skipSendUpdate: true });
                return;
            }
        } else if (targetMinion.attack > 0) {
            withNarrativeRecorder((recorder) => {
                recorder.recordEffect({
                    type: "COMBAT_DAMAGE",
                    sourceCardUuid: targetMinion.uuid,
                    target: minionEntityRef(attacker, attackerSpotOwner),
                    amount: targetMinion.attack,
                });
            });
            const retaliationResult = applyDamageToMinion(
                game,
                initiatorOwner,
                attackerBoardIndex,
                attacker,
                targetMinion.attack,
                opponent,
                { skipNarrative: true },
            );
            if (retaliationResult.gameEnded) {
                endCurrentBeat(game);
                await terminateGame(game, { skipSendUpdate: true });
                return;
            }
        }

        const currentTargetBoardIndex = requireMinionIndex(targetOwner, targetMinion);
        if (currentTargetBoardIndex === -1) {
            endCurrentBeat(game);
            recordMinionAttack(minionInfos.minion, game.data.currentRound);
            return;
        }

        if (attackerIsPoisonous) {
            withNarrativeRecorder((recorder) => {
                recorder.recordEffect({
                    type: "COMBAT_DAMAGE",
                    sourceCardUuid: attacker.uuid,
                    target: minionEntityRef(targetMinion, targetSpotOwner),
                    amount: targetMinion.health,
                });
            });
            const attackResult = applyPoisonousToMinion(
                game,
                targetOwner,
                currentTargetBoardIndex,
                targetMinion,
                player,
            );
            endCurrentBeat(game);
            if (attackResult.gameEnded) {
                await terminateGame(game, { skipSendUpdate: true });
                return;
            }
        } else if (attacker.attack > 0) {
            withNarrativeRecorder((recorder) => {
                recorder.recordEffect({
                    type: "COMBAT_DAMAGE",
                    sourceCardUuid: attacker.uuid,
                    target: minionEntityRef(targetMinion, targetSpotOwner),
                    amount: attacker.attack,
                });
            });
            const attackResult = applyDamageToMinion(
                game,
                targetOwner,
                currentTargetBoardIndex,
                targetMinion,
                attacker.attack,
                player,
                { skipNarrative: true },
            );
            endCurrentBeat(game);
            if (attackResult.gameEnded) {
                await terminateGame(game, { skipSendUpdate: true });
                return;
            }
        } else {
            endCurrentBeat(game);
        }

        recordMinionAttack(minionInfos.minion, game.data.currentRound);
    });
};
