import type { GamePlayer } from "#api_types/game.types";
import type Game from "#models/game";
import { executeWeaponDeathrattles } from "../../../galaguerre/action_engine/execute_weapon_deathrattles.js";
import { recordWeaponBreak } from "../../../galaguerre/game_log/record_game_log.js";

export const breakWeapon = (game: Game, player: GamePlayer): { gameEnded: boolean } => {
    const weaponState = player.weaponState;
    if (!weaponState) return { gameEnded: false };

    const card = weaponState.originalCard;
    recordWeaponBreak(game, player, card);
    const { gameEnded } = executeWeaponDeathrattles(game, player, card);

    player.weaponState = null;

    return { gameEnded };
};
