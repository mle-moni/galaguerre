import {
    DEFAULT_HERO_HEALTH,
    type ActionTarget,
    type CardActionSnapshot,
    type GamePlayer,
} from "#api_types/game.types";
import { drawCards } from "../draw_cards.js";
import { applyHeal, getMinionMaxHealth } from "./apply_heal.js";
import { isTargetedV1Action } from "./is_targeted_v1_action.js";
import { isV1Action } from "./is_v1_action.js";
import { resolveHeroTarget } from "./resolve_hero_target.js";
import { resolveSelectedTarget } from "./resolve_selected_target.js";

const removeMinionIfDead = (board: GamePlayer["board"], spotId: ActionTarget["spotId"]): void => {
    if (spotId === null) return;
    if (board[spotId] && board[spotId]!.health <= 0) {
        board[spotId] = null;
    }
};

export const executeAction = (
    action: CardActionSnapshot,
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
                    removeMinionIfDead(resolved.board, resolved.spotId);
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
        }
        return;
    }

    if (!isV1Action(action)) return;

    switch (action.type) {
        case "DAMAGE": {
            const target =
                action.target !== null
                    ? resolveHeroTarget(action.target, player, opponent)
                    : opponent;
            if (!target) return;
            target.health -= action.damage!;
            break;
        }
        case "HEAL": {
            const target =
                action.target !== null
                    ? resolveHeroTarget(action.target, player, opponent)
                    : player;
            if (!target) return;
            target.health = applyHeal(target.health, action.heal!, DEFAULT_HERO_HEALTH);
            break;
        }
        case "DRAW":
            drawCards(player, action.drawCount!);
            break;
        case "ENEMY_DRAW":
            drawCards(opponent, action.enemyDrawCount!);
            break;
    }
};
