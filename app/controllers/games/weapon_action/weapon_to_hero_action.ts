import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import { getWeaponCannotAttackHero } from "#api_types/weapon_combat";
import { recordAttack } from "../../../galaguerre/game_log/record_game_log.js";
import { applyDamageToHero } from "../../../galaguerre/action_engine/apply_damage_to_hero.js";
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
import { triggerPassives } from "../../../galaguerre/passive_engine/trigger_passives.js";
import { ensureValidAttackTarget, recordHeroAttack } from "../game_utils.js";
import { terminateGame } from "../terminate_game.js";
import type { WeaponActionOptions } from "./weapon_to_minion_action.js";
import { reduceWeaponDurability } from "./reduce_weapon_durability.js";

export const weaponToHeroAction = async ({
    weaponState,
    player,
    opponent,
    game,
    owner,
    socketId,
}: Omit<WeaponActionOptions, "targetMinion">) => {
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

    if (getWeaponCannotAttackHero(weaponState.originalCard)) {
        emitSocketEvent(
            "notify_error",
            {
                error: "Cette arme ne peut pas attaquer le héros adverse",
            },
            socketId,
        );
        return;
    }

    const isValidTarget = ensureValidAttackTarget(opponent.board, owner, null, socketId);
    if (!isValidTarget) return;

    const attackerOwner = resolveSpotOwner(game, player);

    await runGameActionWithNarrative(game, async () => {
        recordAttack(game, player, weaponState.originalCard, {
            type: "HERO",
            playerId: opponent.userId,
        });

        beginLoggedBeat(game, "ATTACK");
        withNarrativeRecorder((recorder) => {
            recorder.recordEffect({
                type: "ATTACK_LUNGE",
                attackerCardUuid: weaponState.originalCard.uuid,
                attackerOwner,
                target: heroEntityRef(resolveSpotOwner(game, opponent)),
            });
            recorder.recordEffect({
                type: "COMBAT_DAMAGE",
                sourceCardUuid: weaponState.originalCard.uuid,
                target: heroEntityRef(resolveSpotOwner(game, opponent)),
                amount: weaponState.damage,
            });
        });

        const { gameEnded: damageGameEnded } = applyDamageToHero(
            game,
            opponent,
            weaponState.damage,
            player,
            { skipNarrative: true },
        );
        endCurrentBeat(game);
        recordHeroAttack(player, game.data.currentRound);

        const { gameEnded: heroAttackPassiveGameEnded } = triggerPassives(
            game,
            "HERO_ATTACK",
            player,
        );

        const { gameEnded: durabilityGameEnded } = reduceWeaponDurability(game, player);
        if (
            durabilityGameEnded ||
            damageGameEnded ||
            heroAttackPassiveGameEnded ||
            player.health <= 0 ||
            opponent.health <= 0
        ) {
            await terminateGame(game, { skipSendUpdate: true });
        }
    });
};
