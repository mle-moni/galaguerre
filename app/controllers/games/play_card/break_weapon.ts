import type { GamePlayer } from "#api_types/game.types";
import type Game from "#models/game";
import { executeWeaponDeathrattles } from "../../../galaguerre/action_engine/execute_weapon_deathrattles.js";

export const breakWeapon = (game: Game, player: GamePlayer): { gameEnded: boolean } => {
    const weaponState = player.weaponState;
    if (!weaponState) return { gameEnded: false };

    const { gameEnded } = executeWeaponDeathrattles(game, player, weaponState.originalCard);

    player.weaponState = null;

    return { gameEnded };
};
