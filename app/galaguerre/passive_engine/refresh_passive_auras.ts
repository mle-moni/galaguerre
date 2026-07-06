import type { GamePlayer } from "#api_types/game.types";
import type Game from "#models/game";
import { reapplyAllPassiveAuras } from "./passive_aura.js";

export const refreshAurasAfterMinionPlayed = (
    game: Game,
    _owner: GamePlayer,
    _boardIndex: number,
): void => {
    reapplyAllPassiveAuras(game);
};
