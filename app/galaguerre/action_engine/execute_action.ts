import {
    DEFAULT_HERO_HEALTH,
    type ActionTarget,
    type CardActionSnapshot,
    type GamePlayer,
    type MinionState,
} from "#api_types/game.types";
import { getEffectiveDamage } from "#api_types/get_effective_damage";
import type Game from "#models/game";
import { drawCards } from "../draw_cards.js";
import {
    getActualDamage,
    getActualHeal,
    recordDamageDealt,
    recordHealingDone,
} from "../game_stats/record_player_stats.js";
import { triggerHealPassives } from "../passive_engine/trigger_heal_passives.js";
import { applyBoostToAllMinions, applyBoostToHero, applyBoostToMinion } from "./apply_boost.js";
import { applyDamageToMinion } from "./apply_damage_to_minion.js";
import { applySilenceToAllMinions, applySilenceToMinion } from "./apply_silence.js";
import { applyHeal, getMinionMaxHealth } from "./apply_heal.js";
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

const triggerHealIfNeeded = (game: Game): boolean => {
    const { gameEnded } = triggerHealPassives(game);
    return gameEnded;
};

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
): boolean => {
    switch (action.type) {
        case "DAMAGE": {
            const damage = getEffectiveDamage(action, damageBonus);
            if (resolved.type === "HERO") {
                const actualDamage = getActualDamage(resolved.player.health, damage);
                resolved.player.health -= damage;
                recordDamageDealt(player, actualDamage);
            } else {
                const owner = getMinionOwner(resolved.board, resolved.spotId, player, opponent);
                const result = applyDamageToMinion(
                    game,
                    owner,
                    resolved.spotId,
                    resolved.minion,
                    damage,
                    player,
                );
                if (result.gameEnded) return true;
            }
            return false;
        }
        case "HEAL": {
            if (resolved.type === "HERO") {
                const actualHeal = getActualHeal(
                    resolved.player.health,
                    action.heal!,
                    DEFAULT_HERO_HEALTH,
                );
                resolved.player.health = applyHeal(
                    resolved.player.health,
                    action.heal!,
                    DEFAULT_HERO_HEALTH,
                );
                recordHealingDone(player, actualHeal);
            } else {
                const maxHealth = getMinionMaxHealth(resolved.minion);
                const actualHeal = getActualHeal(resolved.minion.health, action.heal!, maxHealth);
                resolved.minion.health = applyHeal(resolved.minion.health, action.heal!, maxHealth);
                recordHealingDone(player, actualHeal);
            }
            return triggerHealIfNeeded(game);
        }
        case "BOOST": {
            if (!action.boost) return false;
            if (resolved.type === "HERO") {
                applyBoostToHero(resolved.player, action.boost);
            } else {
                applyBoostToMinion(resolved.minion, action.boost);
            }
            return false;
        }
        case "SILENCE": {
            if (resolved.type !== "MINION") return false;
            const owner = getMinionOwner(resolved.board, resolved.spotId, player, opponent);
            applySilenceToMinion(game, owner, resolved.spotId);
            return false;
        }
        default:
            return false;
    }
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
    if (isTargetedV1Action(action)) {
        if (!selectedTarget) return;

        const resolved = resolveSelectedTarget(selectedTarget, player, opponent);
        if (!resolved) return;

        applyEffectToResolvedTarget(resolved, action, game, player, opponent, damageBonus);
        return;
    }

    if (action.target && hasRandomLimitedTarget(action.target)) {
        const picks = pickRandomLimitedTargets(action.target, player, opponent, sourceMinion);
        for (const pick of picks) {
            const resolved = resolveSelectedTarget(pick, player, opponent);
            if (!resolved) continue;

            const shouldStop = applyEffectToResolvedTarget(
                resolved,
                action,
                game,
                player,
                opponent,
                damageBonus,
            );
            if (shouldStop) return;
        }
        return;
    }

    if (!isV1Action(action)) return;

    switch (action.type) {
        case "DAMAGE": {
            const damage = getEffectiveDamage(action, damageBonus);
            if (action.target?.type === "ALL") {
                for (const target of resolveHeroTargets(action.target, player, opponent)) {
                    const actualDamage = getActualDamage(target.health, damage);
                    target.health -= damage;
                    recordDamageDealt(player, actualDamage);
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
                const actualDamage = getActualDamage(target.health, damage);
                target.health -= damage;
                recordDamageDealt(player, actualDamage);
            }
            break;
        }
        case "HEAL": {
            if (action.target?.type === "ALL") {
                for (const target of resolveHeroTargets(action.target, player, opponent)) {
                    const actualHeal = getActualHeal(
                        target.health,
                        action.heal!,
                        DEFAULT_HERO_HEALTH,
                    );
                    target.health = applyHeal(target.health, action.heal!, DEFAULT_HERO_HEALTH);
                    recordHealingDone(player, actualHeal);
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
                if (triggerHealIfNeeded(game)) return;
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
                if (triggerHealIfNeeded(game)) return;
                break;
            }

            const targets =
                action.target !== null
                    ? resolveHeroTargets(action.target, player, opponent)
                    : [player];
            for (const target of targets) {
                const actualHeal = getActualHeal(target.health, action.heal!, DEFAULT_HERO_HEALTH);
                target.health = applyHeal(target.health, action.heal!, DEFAULT_HERO_HEALTH);
                recordHealingDone(player, actualHeal);
            }
            if (triggerHealIfNeeded(game)) return;
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
    }
};
