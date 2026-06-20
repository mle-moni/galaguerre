import type { GamePlayer } from "#api_types/game.types";
import type Game from "#models/game";
import { applyExistingAurasToMinion, applyPassiveAurasForSource } from "./passive_aura.js";

export const refreshAurasAfterMinionPlayed = (
    game: Game,
    owner: GamePlayer,
    boardIndex: number,
): void => {
    applyPassiveAurasForSource(game, owner, boardIndex);
    applyExistingAurasToMinion(game, owner, boardIndex);
};
