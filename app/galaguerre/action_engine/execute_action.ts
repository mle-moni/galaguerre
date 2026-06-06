import {
    DEFAULT_HERO_HEALTH,
    type ActionTarget,
    type CardActionSnapshot,
    type GamePlayer,
} from "#api_types/game.types";
import type Game from "#models/game";
import { drawCards } from "../draw_cards.js";
import { applyBoostToAllMinions, applyBoostToHero, applyBoostToMinion } from "./apply_boost.js";
import { applyHeal, getMinionMaxHealth } from "./apply_heal.js";
import { isTargetedV1Action } from "./is_targeted_v1_action.js";
import { isV1Action } from "./is_v1_action.js";
import { killMinion } from "./kill_minion.js";
import {
    applyDamageToAllMinions,
    applyHealToAllMinions,
    getTargetBoardEntries,
} from "./apply_mass_minion_effects.js";
import { resolveHeroTargets } from "./resolve_hero_target.js";
import { resolveSelectedTarget } from "./resolve_selected_target.js";

const getMinionOwner = (
    board: GamePlayer["board"],
    _spotId: NonNullable<ActionTarget["spotId"]>,
    player: GamePlayer,
    opponent: GamePlayer,
): GamePlayer => {
    return board === player.board ? player : opponent;
};

export const executeAction = (
    action: CardActionSnapshot,
    game: Game,
    player: GamePlayer,
    opponent: GamePlayer,
    selectedTarget?: ActionTarget,
): void => {
    if (isTargetedV1Action(action)) {
        if (!selectedTarget) return;

        const resolved = resolveSelectedTarget(selectedTarget, player, opponent);
        if (!resolved) return;

        switch (action.type) {
            case "DAMAGE": {
                if (resolved.type === "HERO") {
                    resolved.player.health -= action.damage!;
                } else {
                    resolved.minion.health -= action.damage!;
                    if (resolved.minion.health <= 0) {
                        const owner = getMinionOwner(
                            resolved.board,
                            resolved.spotId,
                            player,
                            opponent,
                        );
                        killMinion(game, owner, resolved.spotId);
                    }
                }
                break;
            }
            case "HEAL": {
                if (resolved.type === "HERO") {
                    resolved.player.health = applyHeal(
                        resolved.player.health,
                        action.heal!,
                        DEFAULT_HERO_HEALTH,
                    );
                } else {
                    resolved.minion.health = applyHeal(
                        resolved.minion.health,
                        action.heal!,
                        getMinionMaxHealth(resolved.minion),
                    );
                }
                break;
            }
            case "BOOST": {
                if (!action.boost) break;
                if (resolved.type === "HERO") {
                    applyBoostToHero(resolved.player, action.boost);
                } else {
                    applyBoostToMinion(resolved.minion, action.boost);
                }
                break;
            }
        }
        return;
    }

    if (!isV1Action(action)) return;

    switch (action.type) {
        case "DAMAGE": {
            if (action.target?.type === "MINION") {
                applyDamageToAllMinions(game, player, opponent, action.target, action.damage!);
                break;
            }

            const targets =
                action.target !== null
                    ? resolveHeroTargets(action.target, player, opponent)
                    : [opponent];
            for (const target of targets) {
                target.health -= action.damage!;
            }
            break;
        }
        case "HEAL": {
            if (action.target?.type === "MINION") {
                applyHealToAllMinions(player, opponent, action.target, action.heal!);
                break;
            }

            const targets =
                action.target !== null
                    ? resolveHeroTargets(action.target, player, opponent)
                    : [player];
            for (const target of targets) {
                target.health = applyHeal(target.health, action.heal!, DEFAULT_HERO_HEALTH);
            }
            break;
        }
        case "DRAW":
            drawCards(player, action.drawCount!, action.drawCardFilter);
            break;
        case "ENEMY_DRAW":
            drawCards(opponent, action.enemyDrawCount!, action.enemyDrawCardFilter);
            break;
        case "BOOST": {
            if (!action.boost || !action.target) break;

            if (action.target.type === "MINION") {
                for (const { board, isOpponent } of getTargetBoardEntries(
                    action.target,
                    player,
                    opponent,
                )) {
                    applyBoostToAllMinions(board, action.target, action.boost, isOpponent);
                }
            } else if (action.target.type === "HERO") {
                for (const target of resolveHeroTargets(action.target, player, opponent)) {
                    applyBoostToHero(target, action.boost);
                }
            }
            break;
        }
    }
};
