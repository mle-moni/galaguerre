import { removeMinionByUuid } from "#api_types/board";
import type { GamePlayer } from "#api_types/game.types";
import type Game from "#models/game";
import { recordMinionDeath } from "../game_log/record_game_log.js";
import {
    removeMinionFromAuraTracking,
    revertPassiveAurasForSource,
} from "../passive_engine/passive_aura.js";
import { executeDeathrattles } from "./execute_deathrattles.js";

const isGameOver = (game: Game): boolean => {
    return game.data.playerOne.health <= 0 || game.data.playerTwo.health <= 0;
};

export const killMinion = (
    game: Game,
    owner: GamePlayer,
    minionUuid: string,
): { gameEnded: boolean } => {
    const minion = owner.board.find((entry) => entry.uuid === minionUuid);
    if (!minion) return { gameEnded: false };

    if (minion.originalCard.type !== "MINION") {
        removeMinionByUuid(owner.board, minionUuid);
        return { gameEnded: false };
    }

    const card = minion.originalCard;
    const isSilenced = minion.isSilenced === true;
    revertPassiveAurasForSource(game, owner, minion);
    removeMinionFromAuraTracking(game, minion);
    removeMinionByUuid(owner.board, minionUuid);

    recordMinionDeath(game, owner, card);
    const { gameEnded } = isSilenced
        ? { gameEnded: false }
        : executeDeathrattles(game, owner, card);

    return { gameEnded: gameEnded || isGameOver(game) };
};
