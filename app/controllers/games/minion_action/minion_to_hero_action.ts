import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import { recordAttack } from "../../../galaguerre/game_log/record_game_log.js";
import { applyDamageToHero } from "../../../galaguerre/action_engine/apply_damage_to_hero.js";
import {
    beginLoggedBeat,
    endCurrentBeat,
} from "../../../galaguerre/game_narrative/narrative_beats.js";
import { heroEntityRef } from "../../../galaguerre/game_narrative/narrative_effects.js";
import { withNarrativeRecorder } from "../../../galaguerre/game_narrative/narrative_context.js";
import { runGameActionWithNarrative } from "../../../galaguerre/game_narrative/run_game_action_with_narrative.js";
import { ensureValidAttackTarget, recordMinionAttack } from "../game_utils.js";
import { terminateGame } from "../terminate_game.js";
import type { MinionActionOptions } from "./minion_to_minion_action.js";

export const minionToHeroAction = async ({
    minionInfos,
    player,
    opponent,
    game,
    owner,
    socketId,
}: Omit<MinionActionOptions, "targetMinion">) => {
    if (owner !== "OPPONENT") {
        emitSocketEvent(
            "notify_error",
            {
                error: "J'aurai pu te laisser attaquer ton propre héros mais j'ai décidé d'être clément...",
            },
            socketId,
        );
        return;
    }

    const isValidTarget = ensureValidAttackTarget(opponent.board, owner, null, socketId);
    if (!isValidTarget) return;

    const attacker = minionInfos.minion;
    const attackerOwner = minionInfos.position.owner;

    await runGameActionWithNarrative(game, async () => {
        recordAttack(game, player, attacker.originalCard, {
            type: "HERO",
            playerId: opponent.userId,
        });

        const playerTarget = owner === "OPPONENT" ? opponent : player;
        const targetOwner = owner;

        beginLoggedBeat(game, "ATTACK");
        withNarrativeRecorder((recorder) => {
            recorder.recordEffect({
                type: "ATTACK_LUNGE",
                attackerCardUuid: attacker.uuid,
                attackerOwner,
                target: heroEntityRef(targetOwner),
            });
            recorder.recordEffect({
                type: "COMBAT_DAMAGE",
                sourceCardUuid: attacker.uuid,
                target: heroEntityRef(targetOwner),
                amount: attacker.attack,
            });
        });

        const { gameEnded: damageGameEnded } = applyDamageToHero(
            game,
            playerTarget,
            attacker.attack,
            player,
            { skipNarrative: true },
        );
        endCurrentBeat(game);
        recordMinionAttack(attacker, game.data.currentRound);

        if (damageGameEnded || player.health <= 0 || opponent.health <= 0) {
            await terminateGame(game, { skipSendUpdate: true });
        }
    });
};
