import type Game from "#models/game";
import { triggerPassives } from "./trigger_passives.js";

export const triggerHealPassives = (game: Game): { gameEnded: boolean } => {
    return triggerPassives(game, "HEAL");
};
