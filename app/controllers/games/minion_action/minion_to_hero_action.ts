import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import { recordAttack } from "../../../galaguerre/game_log/record_game_log.js";
import { applyDamageToHero } from "../../../galaguerre/action_engine/apply_damage_to_hero.js";
import { popStealth } from "../../../galaguerre/action_engine/apply_damage_to_minion.js";
import {
    beginLoggedBeat,
    endCurrentBeat,
} from "../../../galaguerre/game_narrative/narrative_beats.js";
import {
    heroEntityRef,
    resolveSpotOwner,
} from "../../../galaguerre/game_narrative/narrative_effects.js";
import { withNarrativeRecorder } from "../../../galaguerre/game_narrative/narrative_context.js";
import { runGameActionWithNarrative } from "../../../galaguerre/game_narrative/run_game_action_with_narrative.js";
import { ensureValidAttackTarget, canMinionAttackHero } from "../game_utils.js";
import { completeMinionAttack } from "./complete_minion_attack.js";
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

    const attacker = minionInfos.minion;

    if (!canMinionAttackHero(attacker, game.data.currentRound)) {
        emitSocketEvent(
            "notify_error",
            { error: "Ce monstre avec Ruée ne peut pas attaquer le héros ce tour" },
            socketId,
        );
        return;
    }

    const isValidTarget = ensureValidAttackTarget(opponent.board, owner, null, socketId);
    if (!isValidTarget) return;

    await runGameActionWithNarrative(game, async () => {
        recordAttack(game, player, attacker.originalCard, {
            type: "HERO",
            playerId: opponent.userId,
        });

        const targetSpotOwner = resolveSpotOwner(game, opponent);

        beginLoggedBeat(game, "ATTACK");
        popStealth(attacker);
        withNarrativeRecorder((recorder) => {
            recorder.recordEffect({
                type: "ATTACK_LUNGE",
                attackerCardUuid: attacker.uuid,
                attackerOwner: resolveSpotOwner(game, player),
                target: heroEntityRef(targetSpotOwner),
            });
            recorder.recordEffect({
                type: "COMBAT_DAMAGE",
                sourceCardUuid: attacker.uuid,
                target: heroEntityRef(targetSpotOwner),
                amount: attacker.attack,
            });
        });

        const { gameEnded: damageGameEnded } = applyDamageToHero(
            game,
            opponent,
            attacker.attack,
            player,
            { skipNarrative: true },
        );
        endCurrentBeat(game);
        const { gameEnded: attackEffectGameEnded } = await completeMinionAttack(
            game,
            player,
            attacker,
        );

        if (
            damageGameEnded ||
            attackEffectGameEnded ||
            player.health <= 0 ||
            opponent.health <= 0
        ) {
            await terminateGame(game, { skipSendUpdate: true });
        }
    });
};
