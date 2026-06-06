import type { WeaponCard } from "#api_types/game.types";
import { sendGameUpdate } from "../send_game_update.js";
import { terminateGame } from "../terminate_game.js";
import type { PlayCardOptions } from "./game_play_card.js";
import { breakWeapon } from "./break_weapon.js";
import { instantiateWeapon } from "./instantiate_weapon.js";

interface PlayWeaponOptions extends Omit<PlayCardOptions, "card"> {
    card: WeaponCard;
}

export const playWeapon = async ({ card, player, game }: PlayWeaponOptions) => {
    if (player.weaponState) {
        const { gameEnded } = breakWeapon(game, player);
        if (gameEnded) {
            await terminateGame(game);
            return;
        }
    }

    player.weaponState = instantiateWeapon(card);
    player.hand = player.hand.filter((handCard) => handCard.uuid !== card.uuid);
    player.mana -= card.cost;

    await game.save();

    sendGameUpdate(game);
};
