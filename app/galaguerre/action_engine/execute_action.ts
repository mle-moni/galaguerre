import {
    type ActionTarget,
    type CardActionFieldsSnapshot,
    type CardActionSnapshot,
    type GamePlayer,
    type MinionState,
} from "#api_types/game.types";
import type { AdjacencyContext } from "#api_types/adjacent_targeting";
import { getActionTarget } from "#api_types/action_fields_utils";
import { getEffectiveDamage } from "#api_types/get_effective_damage";
import type Game from "#models/game";
import { breakWeapon } from "#controllers/games/play_card/break_weapon";
import { resolveSummonCount } from "./resolve_summon_count.js";
import { drawCards } from "../draw_cards.js";
import { addCardsToDeck, executeDeckCardAction } from "../deck_card_operations.js";
import { executeHandCardAction } from "../hand_card_operations.js";
import { executeGenerateHandAction } from "../generate_hand_cards.js";
import { applyBoostToAllMinions, applyBoostToHero, applyBoostToMinion } from "./apply_boost.js";
import { applyDamageToMinion } from "./apply_damage_to_minion.js";
import { applyDamageToHero } from "./apply_damage_to_hero.js";
import { applySilenceToAllMinions, applySilenceToMinion } from "./apply_silence.js";
import { applyDestroyToAllMinions } from "./apply_destroy.js";
import { applyDefeat } from "./apply_defeat.js";
import { killMinion } from "./kill_minion.js";
import { applyReconversionToAllMinions, applyReconversionToMinion } from "./apply_reconversion.js";
import { applyHealToHero, applyHealToMinion } from "./apply_heal_with_passives.js";
import {
    applyMindControlToMinion,
    canMindControlTarget,
    canMindControlWithBoardSpace,
} from "./apply_mind_control.js";
import { applyReturnToHand } from "./apply_return_to_hand.js";
import { refreshGameDynamicCosts } from "../dynamic_cost/compute_effective_cost.js";
import { evaluateActionCondition } from "./evaluate_action_condition.js";
import {
    shouldTriggerOnTargetResult,
    type TargetEffectOutcome,
} from "./evaluate_on_target_result.js";
import { isTargetedV1Action } from "./is_targeted_v1_action.js";
import { isV1Action } from "./is_v1_action.js";
import { applyDamageToAllMinions, applyHealToAllMinions } from "./apply_mass_minion_effects.js";
import { hasRandomLimitedTarget, pickRandomLimitedTargets } from "./pick_random_targets.js";
import { resolveHeroTargets } from "./resolve_hero_target.js";
import { resolveSelectedTarget, type ResolvedTarget } from "./resolve_selected_target.js";
import { summonMinions, summonRandomMinionsFromHand } from "./summon_minion.js";
import { triggerSummonPassivesForCards } from "../passive_engine/trigger_summon_passives.js";
import { requireMinionIndex } from "./find_minion_on_board.js";
import { resolveManaAmount } from "./resolve_mana_amount.js";
import { recordGainMana, resolveSpotOwner } from "../game_narrative/narrative_effects.js";
import {
    getAbilityImpactKind,
    recordAbilityImpact,
    recordAoeAbilityImpactIfNeeded,
    resolveAbilityImpactDelivery,
    resolveAbilityImpactSource,
    resolvedTargetToEntityRef,
} from "../game_narrative/record_ability_impact.js";
import { startDiscover } from "../discover/start_discover.js";
import type { ExecuteActionOptions, ExecuteActionResult } from "../discover/discover_types.js";

const buildAdjacencyContext = (
    player: GamePlayer,
    opponent: GamePlayer,
    sourceMinion?: MinionState,
    selectedTarget?: ActionTarget,
): AdjacencyContext => ({
    player,
    opponent,
    sourceMinion,
    selectedTarget,
});

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

            const owner = resolved.owner;
            const boardIndex = requireMinionIndex(owner, resolved.minion);
            if (boardIndex === -1) return { gameEnded: false };

            const result = applyDamageToMinion(
                game,
                owner,
                boardIndex,
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

            const owner = resolved.owner;
            const boardIndex = requireMinionIndex(owner, resolved.minion);
            if (boardIndex === -1) return { gameEnded: false };

            const { gameEnded } = applyHealToMinion(
                game,
                owner,
                boardIndex,
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
                applyBoostToMinion(resolved.minion, action.boost, {
                    game,
                    owner: resolved.owner,
                });
            }
            return { gameEnded: false };
        }
        case "SILENCE": {
            if (resolved.type !== "MINION") return { gameEnded: false };
            const owner = resolved.owner;
            const boardIndex = requireMinionIndex(owner, resolved.minion);
            if (boardIndex === -1) return { gameEnded: false };
            applySilenceToMinion(game, owner, boardIndex);
            return { gameEnded: false };
        }
        case "DESTROY": {
            if (resolved.type !== "MINION") return { gameEnded: false };
            const owner = resolved.owner;
            return killMinion(game, owner, resolved.minion.uuid);
        }
        case "BREAK_WEAPON": {
            if (resolved.type !== "HERO") return { gameEnded: false };
            return breakWeapon(game, resolved.player);
        }
        case "RECONVERSION": {
            if (resolved.type !== "MINION" || action.reconvertParameters === null) {
                return { gameEnded: false };
            }
            const owner = resolved.owner;
            const boardIndex = requireMinionIndex(owner, resolved.minion);
            if (boardIndex === -1) return { gameEnded: false };

            applyReconversionToMinion(
                game,
                owner,
                boardIndex,
                action.reconvertParameters,
                resolved.minion,
                player,
            );
            return { gameEnded: false };
        }
        case "MIND_CONTROL": {
            if (resolved.type !== "MINION") return { gameEnded: false };
            if (!evaluateActionCondition(action.actionCondition, player, opponent)) {
                return { gameEnded: false };
            }
            const sourceOwner = resolved.owner;
            if (!canMindControlTarget(player, sourceOwner, resolved.minion.uuid)) {
                return { gameEnded: false };
            }
            const boardIndex = requireMinionIndex(sourceOwner, resolved.minion);
            if (boardIndex === -1) return { gameEnded: false };
            applyMindControlToMinion(game, player, sourceOwner, boardIndex);
            return { gameEnded: false };
        }
        case "RETURN_TO_HAND": {
            if (resolved.type !== "MINION") return { gameEnded: false };
            const owner = resolved.owner;
            const boardIndex = requireMinionIndex(owner, resolved.minion);
            if (boardIndex === -1) return { gameEnded: false };
            applyReturnToHand(game, owner, boardIndex, resolved.minion, action.costReduction);
            return { gameEnded: false };
        }
        case "DECK_CARD": {
            if (
                resolved.type !== "MINION" ||
                action.deckCardOperation !== "ADD" ||
                action.copyCount === null ||
                action.deckPlacement === null
            ) {
                return { gameEnded: false };
            }

            const cardId = resolved.minion.originalCard.cardId;
            switch (action.deckTargetTeam) {
                case "PLAYER":
                    addCardsToDeck(player, cardId, action.copyCount, action.deckPlacement);
                    break;
                case "OPPONENT":
                    addCardsToDeck(opponent, cardId, action.copyCount, action.deckPlacement);
                    break;
                case "ALL":
                    addCardsToDeck(player, cardId, action.copyCount, action.deckPlacement);
                    addCardsToDeck(opponent, cardId, action.copyCount, action.deckPlacement);
                    break;
            }
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
    options?: ExecuteActionOptions,
    selectedTarget?: ActionTarget,
): ExecuteActionResult => {
    if (!isV1Action(action)) return "ok";

    const adjacencyContext = buildAdjacencyContext(player, opponent, sourceMinion, selectedTarget);

    recordAoeAbilityImpactIfNeeded(action, game, player, opponent, sourceMinion, adjacencyContext);

    switch (action.type) {
        case "DAMAGE": {
            const damage = getEffectiveDamage(action, damageBonus);
            if (action.target?.type === "ALL") {
                for (const target of resolveHeroTargets(action.target, player, opponent)) {
                    const { gameEnded } = applyDamageToHero(game, target, damage, player);
                    if (gameEnded) return "ok";
                }
                applyDamageToAllMinions(
                    game,
                    player,
                    opponent,
                    action.target,
                    damage,
                    player,
                    sourceMinion,
                    adjacencyContext,
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
                    adjacencyContext,
                );
                break;
            }

            const targets =
                action.target !== null
                    ? resolveHeroTargets(action.target, player, opponent)
                    : [opponent];
            for (const target of targets) {
                const { gameEnded } = applyDamageToHero(game, target, damage, player);
                if (gameEnded) return "ok";
            }
            break;
        }
        case "HEAL": {
            if (action.target?.type === "ALL") {
                for (const target of resolveHeroTargets(action.target, player, opponent)) {
                    const { gameEnded } = applyHealToHero(game, target, action.heal!, player);
                    if (gameEnded) return "ok";
                }
                applyHealToAllMinions(
                    game,
                    player,
                    opponent,
                    action.target,
                    action.heal!,
                    player,
                    sourceMinion,
                    adjacencyContext,
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
                    adjacencyContext,
                );
                break;
            }

            const targets =
                action.target !== null
                    ? resolveHeroTargets(action.target, player, opponent)
                    : [player];
            for (const target of targets) {
                const { gameEnded } = applyHealToHero(game, target, action.heal!, player);
                if (gameEnded) return "ok";
            }
            break;
        }
        case "DRAW":
            drawCards(
                player,
                action.drawCount!,
                action.drawCardFilter,
                game,
                action.drawCardFilterAlternatives,
            );
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
                applyBoostToAllMinions(
                    game,
                    player,
                    opponent,
                    action.target,
                    action.boost,
                    sourceMinion,
                    adjacencyContext,
                );
            } else if (action.target.type === "MINION") {
                applyBoostToAllMinions(
                    game,
                    player,
                    opponent,
                    action.target,
                    action.boost,
                    sourceMinion,
                    adjacencyContext,
                );
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
        case "DESTROY": {
            if (!action.target) break;

            if (action.target.type === "ALL" || action.target.type === "MINION") {
                const { gameEnded } = applyDestroyToAllMinions(
                    game,
                    player,
                    opponent,
                    action.target,
                    sourceMinion,
                );
                if (gameEnded) return "ok";
            }
            break;
        }
        case "BREAK_WEAPON": {
            if (!action.target) break;

            for (const target of resolveHeroTargets(action.target, player, opponent)) {
                const { gameEnded } = breakWeapon(game, target);
                if (gameEnded) return "ok";
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
        case "SUMMON": {
            if (!action.summonParameters || action.summonCount === null) break;

            const summonCount = resolveSummonCount(action, player, opponent);
            if (summonCount <= 0) break;

            const { summonedCards } = summonMinions(
                game,
                player,
                action.summonTargetTeam,
                action.summonParameters,
                summonCount,
                sourceMinion,
            );
            const { gameEnded } = triggerSummonPassivesForCards(game, player, summonedCards);
            if (gameEnded) return "ok";
            break;
        }
        case "SUMMON_FROM_HAND": {
            const { summonedCards } = summonRandomMinionsFromHand(
                game,
                player,
                action.summonTargetTeam,
                action.handCardFilter,
                action.summonCount,
            );
            const { gameEnded } = triggerSummonPassivesForCards(game, player, summonedCards);
            if (gameEnded) return "ok";
            break;
        }
        case "DECK_CARD":
            executeDeckCardAction(action, game, player, opponent);
            break;
        case "HAND_CARD":
            executeHandCardAction(action, game, player, opponent);
            break;
        case "GENERATE_HAND":
            executeGenerateHandAction(action, game, player, opponent);
            break;
        case "DISCOVER": {
            if (!evaluateActionCondition(action.actionCondition, player, opponent)) return "ok";
            if (!options?.discoverContext) return "ok";
            return startDiscover(game, player, action, options.discoverContext);
        }
        case "MANA":
            if (action.subtype === "TEMPORARY_CHANGE") {
                const gain = resolveManaAmount(action, player, opponent);
                player.mana += gain;
                recordGainMana(resolveSpotOwner(game, player), gain);
            }
            break;
        case "NEXT_SPELL_COST_REDUCTION":
            player.nextSpellCostReduction = (player.nextSpellCostReduction ?? 0) + action.amount;
            refreshGameDynamicCosts(game.data);
            break;
        case "DEFEAT": {
            const { gameEnded } = applyDefeat(game, player, opponent, action.targetTeam);
            if (gameEnded) return "ok";
            break;
        }
    }

    return "ok";
};

const tryExecuteOnTargetResult = (
    action: CardActionSnapshot,
    outcome: TargetEffectOutcome,
    game: Game,
    player: GamePlayer,
    opponent: GamePlayer,
    damageBonus: number,
    sourceMinion?: MinionState,
    options?: ExecuteActionOptions,
): ExecuteActionResult => {
    if (!action.onTargetResult) return "ok";

    if (!shouldTriggerOnTargetResult(action.onTargetResult, outcome)) return "ok";

    return executeNonTargetedV1Action(
        action.onTargetResult.action,
        game,
        player,
        opponent,
        damageBonus,
        sourceMinion,
        options,
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
    options?: ExecuteActionOptions,
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

    const followUpResult = tryExecuteOnTargetResult(
        action,
        outcome,
        game,
        player,
        opponent,
        damageBonus,
        sourceMinion,
        options,
    );
    return followUpResult === "discover_pending";
};

export const executeAction = (
    action: CardActionSnapshot,
    game: Game,
    player: GamePlayer,
    opponent: GamePlayer,
    selectedTarget?: ActionTarget,
    damageBonus = 0,
    sourceMinion?: MinionState,
    options?: ExecuteActionOptions,
): ExecuteActionResult => {
    if (action.type === "MIND_CONTROL") {
        if (!evaluateActionCondition(action.actionCondition, player, opponent)) return "ok";
        if (!canMindControlWithBoardSpace(player)) return "ok";
    }

    if (isTargetedV1Action(action)) {
        if (!selectedTarget) return "ok";

        const resolved = resolveSelectedTarget(selectedTarget, player, opponent);
        if (!resolved) return "ok";

        const kind = getAbilityImpactKind(action);
        if (kind) {
            recordAbilityImpact({
                kind,
                delivery: resolveAbilityImpactDelivery(kind, "targeted"),
                source: resolveAbilityImpactSource(game, player, sourceMinion),
                targets: [resolvedTargetToEntityRef(resolved, game)],
            });
        }

        const shouldStop = applyTargetedEffectWithFollowUp(
            resolved,
            action,
            game,
            player,
            opponent,
            damageBonus,
            sourceMinion,
            options,
        );
        if (!shouldStop) return "ok";
        if (game.data.playerOne.health <= 0 || game.data.playerTwo.health <= 0) return "ok";
        return "discover_pending";
    }

    const randomTarget = getActionTarget(action);
    if (randomTarget && hasRandomLimitedTarget(randomTarget)) {
        const picks = pickRandomLimitedTargets(randomTarget, player, opponent, sourceMinion);
        const resolvedPicks: ResolvedTarget[] = [];
        for (const pick of picks) {
            const resolved = resolveSelectedTarget(pick, player, opponent);
            if (resolved) resolvedPicks.push(resolved);
        }

        const kind = getAbilityImpactKind(action);
        if (kind && resolvedPicks.length > 0) {
            recordAbilityImpact({
                kind,
                delivery: resolveAbilityImpactDelivery(kind, "random_multi"),
                source: resolveAbilityImpactSource(game, player, sourceMinion),
                targets: resolvedPicks.map((resolved) => resolvedTargetToEntityRef(resolved, game)),
            });
        }

        for (const resolved of resolvedPicks) {
            const shouldStop = applyTargetedEffectWithFollowUp(
                resolved,
                action,
                game,
                player,
                opponent,
                damageBonus,
                sourceMinion,
                options,
            );
            if (shouldStop) {
                if (game.data.playerOne.health <= 0 || game.data.playerTwo.health <= 0) return "ok";
                return "discover_pending";
            }
        }
        return "ok";
    }

    return executeNonTargetedV1Action(
        action,
        game,
        player,
        opponent,
        damageBonus,
        sourceMinion,
        options,
        selectedTarget,
    );
};
