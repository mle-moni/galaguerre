import type { GamePlayer, MinionSpotId } from "#api_types/game.types";
import type Game from "#models/game";
import { applyExistingAurasToMinion, applyPassiveAurasForSource } from "./passive_aura.js";

export const refreshAurasAfterMinionPlayed = (
    game: Game,
    owner: GamePlayer,
    spotId: MinionSpotId,
): void => {
    applyPassiveAurasForSource(game, owner, spotId);
    applyExistingAurasToMinion(game, owner, spotId);
};
