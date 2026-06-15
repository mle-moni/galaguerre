import type { WeaponCard } from "#api_types/game.types";
import { computeEffectiveCost } from "../../../galaguerre/dynamic_cost/compute_effective_cost.js";
import { recordPlayCard } from "../../../galaguerre/game_log/record_game_log.js";
import { triggerPlayCardPassives } from "../../../galaguerre/passive_engine/trigger_play_card_passives.js";
import {
    recordManaSpent,
    recordWeaponPlayed,
} from "../../../galaguerre/game_stats/record_player_stats.js";
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

    const opponent = player === game.data.playerOne ? game.data.playerTwo : game.data.playerOne;
    const effectiveCost = computeEffectiveCost(card, player, opponent);
    card.cost = effectiveCost;

    player.weaponState = instantiateWeapon(card);
    player.hand = player.hand.filter((handCard) => handCard.uuid !== card.uuid);
    recordPlayCard(game, player, card);
    player.mana -= effectiveCost;
    recordManaSpent(player, effectiveCost);
    recordWeaponPlayed(player);

    const { gameEnded } = triggerPlayCardPassives(game, player, card);

    if (gameEnded) {
        await terminateGame(game);
        return;
    }

    await game.save();

    sendGameUpdate(game);
};
