import type { GamePlayer, MinionState, SpotOwner, WeaponState } from "#api_types/game.types";
import type Game from "#models/game";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import { recordAttack } from "../../../galaguerre/game_log/record_game_log.js";
import { applyDamageToHero } from "../../../galaguerre/action_engine/apply_damage_to_hero.js";
import { applyDamageToMinion } from "../../../galaguerre/action_engine/apply_damage_to_minion.js";
import { requireMinionIndex } from "../../../galaguerre/action_engine/find_minion_on_board.js";
import {
    beginLoggedBeat,
    endCurrentBeat,
} from "../../../galaguerre/game_narrative/narrative_beats.js";
import {
    heroEntityRef,
    minionEntityRef,
    resolveSpotOwner,
} from "../../../galaguerre/game_narrative/narrative_effects.js";
import { withNarrativeRecorder } from "../../../galaguerre/game_narrative/narrative_context.js";
import { runGameActionWithNarrative } from "../../../galaguerre/game_narrative/run_game_action_with_narrative.js";
import { ensureValidAttackTarget, recordHeroAttack } from "../game_utils.js";
import { terminateGame } from "../terminate_game.js";
import { reduceWeaponDurability } from "./reduce_weapon_durability.js";

export interface WeaponActionOptions {
    weaponState: WeaponState;
    game: Game;
    player: GamePlayer;
    opponent: GamePlayer;
    owner: SpotOwner;
    targetMinion: MinionState;
    socketId: string;
}

export const weaponToMinionAction = async ({
    weaponState,
    opponent,
    targetMinion,
    owner,
    player,
    game,
    socketId,
}: WeaponActionOptions) => {
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

    const boardIndex = requireMinionIndex(opponent, targetMinion);
    if (boardIndex === -1) {
        emitSocketEvent(
            "notify_error",
            { error: "Vous ne pouvez pas attaquer ce serviteur ici" },
            socketId,
        );
        return;
    }

    const attackerOwner = resolveSpotOwner(game, player);

    await runGameActionWithNarrative(game, async () => {
        recordAttack(game, player, weaponState.originalCard, {
            type: "MINION",
            card: targetMinion.originalCard,
        });

        beginLoggedBeat(game, "ATTACK");
        withNarrativeRecorder((recorder) => {
            recorder.recordEffect({
                type: "ATTACK_LUNGE",
                attackerCardUuid: weaponState.originalCard.uuid,
                attackerOwner,
                target: minionEntityRef(targetMinion, owner),
            });
            recorder.recordEffect({
                type: "COMBAT_DAMAGE",
                sourceCardUuid: weaponState.originalCard.uuid,
                target: minionEntityRef(targetMinion, owner),
                amount: weaponState.damage,
            });
        });

        const weaponDamageResult = applyDamageToMinion(
            game,
            opponent,
            boardIndex,
            targetMinion,
            weaponState.damage,
            player,
            { skipNarrative: true },
        );
        if (weaponDamageResult.gameEnded) {
            endCurrentBeat(game);
            await terminateGame(game, { skipSendUpdate: true });
            return;
        }

        if (targetMinion.attack > 0) {
            withNarrativeRecorder((recorder) => {
                recorder.recordEffect({
                    type: "COMBAT_DAMAGE",
                    sourceCardUuid: targetMinion.uuid,
                    target: heroEntityRef(attackerOwner),
                    amount: targetMinion.attack,
                });
            });
        }

        const { gameEnded: retaliationGameEnded } = applyDamageToHero(
            game,
            player,
            targetMinion.attack,
            opponent,
            { skipNarrative: true },
        );

        endCurrentBeat(game);
        recordHeroAttack(player, game.data.currentRound);

        const { gameEnded: durabilityGameEnded } = reduceWeaponDurability(game, player);
        if (
            durabilityGameEnded ||
            retaliationGameEnded ||
            player.health <= 0 ||
            opponent.health <= 0
        ) {
            await terminateGame(game, { skipSendUpdate: true });
        }
    });
};
