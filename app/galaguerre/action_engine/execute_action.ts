import type { CardActionSnapshot, GamePlayer } from "#api_types/game.types";
import { drawCards } from "../draw_cards.js";
import { isV1Action } from "./is_v1_action.js";

export const executeAction = (
    action: CardActionSnapshot,
    player: GamePlayer,
    opponent: GamePlayer,
): void => {
    if (!isV1Action(action)) return;

    switch (action.type) {
        case "DAMAGE":
            opponent.health -= action.damage!;
            break;
        case "HEAL":
            player.health += action.heal!;
            break;
        case "DRAW":
            drawCards(player, action.drawCount!);
            break;
        case "ENEMY_DRAW":
            drawCards(opponent, action.enemyDrawCount!);
            break;
    }
};
