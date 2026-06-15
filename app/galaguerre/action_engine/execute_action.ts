import {
    type ActionTarget,
    type CardActionFieldsSnapshot,
    type CardActionSnapshot,
    type GamePlayer,
    type MinionState,
} from "#api_types/game.types";
import { getEffectiveDamage } from "#api_types/get_effective_damage";
import type Game from "#models/game";
import { drawCards } from "../draw_cards.js";
import { applyBoostToAllMinions, applyBoostToHero, applyBoostToMinion } from "./apply_boost.js";
import { applyDamageToMinion } from "./apply_damage_to_minion.js";
import { applyDamageToHero } from "./apply_damage_to_hero.js";
import { applySilenceToAllMinions, applySilenceToMinion } from "./apply_silence.js";
import { applyReconversionToAllMinions, applyReconversionToMinion } from "./apply_reconversion.js";
import { applyHealToHero, applyHealToMinion } from "./apply_heal_with_passives.js";
import {
    applyMindControlToMinion,
    canMindControlTarget,
    canMindControlWithBoardSpace,
} from "./apply_mind_control.js";
import { evaluateActionCondition } from "./evaluate_action_condition.js";
import {
    shouldTriggerOnTargetResult,
    type TargetEffectOutcome,
} from "./evaluate_on_target_result.js";
import { isTargetedV1Action } from "./is_targeted_v1_action.js";
import { isV1Action } from "./is_v1_action.js";
import {
    applyDamageToAllMinions,
    applyHealToAllMinions,
    getTargetBoardEntries,
} from "./apply_mass_minion_effects.js";
import { hasRandomLimitedTarget, pickRandomLimitedTargets } from "./pick_random_targets.js";
import { resolveHeroTargets } from "./resolve_hero_target.js";
import { resolveSelectedTarget, type ResolvedTarget } from "./resolve_selected_target.js";

const getMinionOwner = (
    board: GamePlayer["board"],
    _spotId: NonNullable<ActionTarget["spotId"]>,
    player: GamePlayer,
    opponent: GamePlayer,
): GamePlayer => {
    return board === player.board ? player : opponent;
};

const applyEffectToResolvedTarget = (
    resolved: ResolvedTarget,
    action: CardActionSnapshot,
    game: Game,
    player: GamePlayer,
    opponent: GamePlayer,
    damageBonus: number,
): TargetEffectOutcome => {
    switch (action.type) {
        case "DAMAGE": {
            const damage = getEffectiveDamage(action, damageBonus);
            if (resolved.type === "HERO") {
                const { gameEnded } = applyDamageToHero(game, resolved.player, damage, player);
                return { gameEnded };
            }

            const owner = getMinionOwner(resolved.board, resolved.spotId, player, opponent);
            const result = applyDamageToMinion(
                game,
                owner,
                resolved.spotId,
                resolved.minion,
                damage,
                player,
            );
            return {
                gameEnded: result.gameEnded,
                minionKilled: result.killed,
                survivingMinion: result.killed ? undefined : resolved.minion,
            };
        }
        case "HEAL": {
            if (resolved.type === "HERO") {
                const { gameEnded } = applyHealToHero(game, resolved.player, action.heal!, player);
                return { gameEnded };
            }

            const owner = getMinionOwner(resolved.board, resolved.spotId, player, opponent);
            const { gameEnded } = applyHealToMinion(
                game,
                owner,
                resolved.spotId,
                resolved.minion,
                action.heal!,
                player,
            );
            return { gameEnded };
        }
        case "BOOST": {
            if (!action.boost) return { gameEnded: false };
            if (resolved.type === "HERO") {
                applyBoostToHero(resolved.player, action.boost);
            } else {
                applyBoostToMinion(resolved.minion, action.boost);
            }
            return { gameEnded: false };
        }
        case "SILENCE": {
            if (resolved.type !== "MINION") return { gameEnded: false };
            const owner = getMinionOwner(resolved.board, resolved.spotId, player, opponent);
            applySilenceToMinion(game, owner, resolved.spotId);
            return { gameEnded: false };
        }
        case "RECONVERSION": {
            if (resolved.type !== "MINION" || action.reconvertParameters === null) {
                return { gameEnded: false };
            }
            const owner = getMinionOwner(resolved.board, resolved.spotId, player, opponent);
            applyReconversionToMinion(
                game,
                owner,
                resolved.spotId,
                action.reconvertParameters,
                resolved.minion,
            );
            return { gameEnded: false };
        }
        case "MIND_CONTROL": {
            if (resolved.type !== "MINION") return { gameEnded: false };
            if (!evaluateActionCondition(action.actionCondition, player, opponent)) {
                return { gameEnded: false };
            }
            const sourceOwner = getMinionOwner(resolved.board, resolved.spotId, player, opponent);
            if (!canMindControlTarget(player, sourceOwner, resolved.spotId)) {
                return { gameEnded: false };
            }
            applyMindControlToMinion(game, player, sourceOwner, resolved.spotId);
            return { gameEnded: false };
        }
        default:
            return { gameEnded: false };
    }
};

const executeNonTargetedV1Action = (
    action: CardActionFieldsSnapshot,
    game: Game,
    player: GamePlayer,
    opponent: GamePlayer,
    damageBonus: number,
    sourceMinion?: MinionState,
): void => {
    if (!isV1Action(action)) return;

    switch (action.type) {
        case "DAMAGE": {
            const damage = getEffectiveDamage(action, damageBonus);
            if (action.target?.type === "ALL") {
                for (const target of resolveHeroTargets(action.target, player, opponent)) {
                    const { gameEnded } = applyDamageToHero(game, target, damage, player);
                    if (gameEnded) return;
                }
                applyDamageToAllMinions(
                    game,
                    player,
                    opponent,
                    action.target,
                    damage,
                    player,
                    sourceMinion,
                );
                break;
            }

            if (action.target?.type === "MINION") {
                applyDamageToAllMinions(
                    game,
                    player,
                    opponent,
                    action.target,
                    damage,
                    player,
                    sourceMinion,
                );
                break;
            }

            const targets =
                action.target !== null
                    ? resolveHeroTargets(action.target, player, opponent)
                    : [opponent];
            for (const target of targets) {
                const { gameEnded } = applyDamageToHero(game, target, damage, player);
                if (gameEnded) return;
            }
            break;
        }
        case "HEAL": {
            if (action.target?.type === "ALL") {
                for (const target of resolveHeroTargets(action.target, player, opponent)) {
                    const { gameEnded } = applyHealToHero(game, target, action.heal!, player);
                    if (gameEnded) return;
                }
                applyHealToAllMinions(
                    game,
                    player,
                    opponent,
                    action.target,
                    action.heal!,
                    player,
                    sourceMinion,
                );
                break;
            }

            if (action.target?.type === "MINION") {
                applyHealToAllMinions(
                    game,
                    player,
                    opponent,
                    action.target,
                    action.heal!,
                    player,
                    sourceMinion,
                );
                break;
            }

            const targets =
                action.target !== null
                    ? resolveHeroTargets(action.target, player, opponent)
                    : [player];
            for (const target of targets) {
                const { gameEnded } = applyHealToHero(game, target, action.heal!, player);
                if (gameEnded) return;
            }
            break;
        }
        case "DRAW":
            drawCards(player, action.drawCount!, action.drawCardFilter, game);
            break;
        case "ENEMY_DRAW":
            drawCards(opponent, action.enemyDrawCount!, action.enemyDrawCardFilter, game);
            break;
        case "BOOST": {
            if (!action.boost || !action.target) break;

            if (action.target.type === "ALL") {
                for (const target of resolveHeroTargets(action.target, player, opponent)) {
                    applyBoostToHero(target, action.boost);
                }
                for (const { board, isOpponent } of getTargetBoardEntries(
                    action.target,
                    player,
                    opponent,
                )) {
                    applyBoostToAllMinions(
                        board,
                        action.target,
                        action.boost,
                        isOpponent,
                        sourceMinion,
                    );
                }
            } else if (action.target.type === "MINION") {
                for (const { board, isOpponent } of getTargetBoardEntries(
                    action.target,
                    player,
                    opponent,
                )) {
                    applyBoostToAllMinions(
                        board,
                        action.target,
                        action.boost,
                        isOpponent,
                        sourceMinion,
                    );
                }
            } else if (action.target.type === "HERO") {
                for (const target of resolveHeroTargets(action.target, player, opponent)) {
                    applyBoostToHero(target, action.boost);
                }
            }
            break;
        }
        case "SILENCE": {
            if (!action.target) break;

            if (action.target.type === "ALL" || action.target.type === "MINION") {
                applySilenceToAllMinions(game, player, opponent, action.target, sourceMinion);
            }
            break;
        }
        case "RECONVERSION": {
            if (!action.target || action.reconvertParameters === null) break;

            if (action.target.type === "ALL" || action.target.type === "MINION") {
                applyReconversionToAllMinions(
                    game,
                    player,
                    opponent,
                    action.target,
                    action.reconvertParameters,
                    sourceMinion,
                );
            }
            break;
        }
        case "MIND_CONTROL":
            break;
    }
};

const tryExecuteOnTargetResult = (
    action: CardActionSnapshot,
    outcome: TargetEffectOutcome,
    game: Game,
    player: GamePlayer,
    opponent: GamePlayer,
    damageBonus: number,
    sourceMinion?: MinionState,
): void => {
    if (!action.onTargetResult) return;

    if (!shouldTriggerOnTargetResult(action.onTargetResult, outcome)) return;

    executeNonTargetedV1Action(
        action.onTargetResult.action,
        game,
        player,
        opponent,
        damageBonus,
        sourceMinion,
    );
};

const applyTargetedEffectWithFollowUp = (
    resolved: ResolvedTarget,
    action: CardActionSnapshot,
    game: Game,
    player: GamePlayer,
    opponent: GamePlayer,
    damageBonus: number,
    sourceMinion?: MinionState,
): boolean => {
    const outcome = applyEffectToResolvedTarget(
        resolved,
        action,
        game,
        player,
        opponent,
        damageBonus,
    );
    if (outcome.gameEnded) return true;

    tryExecuteOnTargetResult(action, outcome, game, player, opponent, damageBonus, sourceMinion);
    return false;
};

export const executeAction = (
    action: CardActionSnapshot,
    game: Game,
    player: GamePlayer,
    opponent: GamePlayer,
    selectedTarget?: ActionTarget,
    damageBonus = 0,
    sourceMinion?: MinionState,
): void => {
    if (action.type === "MIND_CONTROL") {
        if (!evaluateActionCondition(action.actionCondition, player, opponent)) return;
        if (!canMindControlWithBoardSpace(player)) return;
    }

    if (isTargetedV1Action(action)) {
        if (!selectedTarget) return;

        const resolved = resolveSelectedTarget(selectedTarget, player, opponent);
        if (!resolved) return;

        applyTargetedEffectWithFollowUp(
            resolved,
            action,
            game,
            player,
            opponent,
            damageBonus,
            sourceMinion,
        );
        return;
    }

    if (action.target && hasRandomLimitedTarget(action.target)) {
        const picks = pickRandomLimitedTargets(action.target, player, opponent, sourceMinion);
        for (const pick of picks) {
            const resolved = resolveSelectedTarget(pick, player, opponent);
            if (!resolved) continue;

            const shouldStop = applyTargetedEffectWithFollowUp(
                resolved,
                action,
                game,
                player,
                opponent,
                damageBonus,
                sourceMinion,
            );
            if (shouldStop) return;
        }
        return;
    }

    executeNonTargetedV1Action(action, game, player, opponent, damageBonus, sourceMinion);
};
