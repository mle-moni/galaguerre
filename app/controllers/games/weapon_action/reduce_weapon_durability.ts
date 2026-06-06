import type { GamePlayer } from "#api_types/game.types";
import type Game from "#models/game";
import { breakWeapon } from "../play_card/break_weapon.js";

export const reduceWeaponDurability = (game: Game, player: GamePlayer): { gameEnded: boolean } => {
    const weaponState = player.weaponState;
    if (!weaponState) return { gameEnded: false };

    weaponState.durability -= 1;

    if (weaponState.durability <= 0) {
        return breakWeapon(game, player);
    }

    return { gameEnded: false };
};
