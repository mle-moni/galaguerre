import type { SpotOwner, WeaponCard } from "#api_types/game.types";
import { computeEffectiveCost } from "../../../galaguerre/dynamic_cost/compute_effective_cost.js";
import { recordPlayCard } from "../../../galaguerre/game_log/record_game_log.js";
import { triggerPlayCardPassives } from "../../../galaguerre/passive_engine/trigger_play_card_passives.js";
import {
    recordManaSpent,
    recordWeaponPlayed,
} from "../../../galaguerre/game_stats/record_player_stats.js";
import {
    beginLoggedBeat,
    endCurrentBeat,
} from "../../../galaguerre/game_narrative/narrative_beats.js";
import { withNarrativeRecorder } from "../../../galaguerre/game_narrative/narrative_context.js";
import { runGameActionWithNarrative } from "../../../galaguerre/game_narrative/run_game_action_with_narrative.js";
import { terminateGame } from "../terminate_game.js";
import type { PlayCardOptions } from "./game_play_card.js";
import { breakWeapon } from "./break_weapon.js";
import { instantiateWeapon } from "./instantiate_weapon.js";

interface PlayWeaponOptions extends Omit<PlayCardOptions, "card"> {
    card: WeaponCard;
}

const resolvePlayerOwner = (
    game: PlayCardOptions["game"],
    player: PlayCardOptions["player"],
): SpotOwner => (player === game.data.playerOne ? "PLAYER" : "OPPONENT");

export const playWeapon = async ({ card, player, game }: PlayWeaponOptions) => {
    const opponent = player === game.data.playerOne ? game.data.playerTwo : game.data.playerOne;
    const effectiveCost = computeEffectiveCost(card, player, opponent);
    card.cost = effectiveCost;
    const spotOwner = resolvePlayerOwner(game, player);

    await runGameActionWithNarrative(game, async () => {
        if (player.weaponState) {
            const { gameEnded } = breakWeapon(game, player);
            if (gameEnded) {
                await terminateGame(game, { skipSendUpdate: true });
                return;
            }
        }

        player.weaponState = instantiateWeapon(card);
        player.hand = player.hand.filter((handCard) => handCard.uuid !== card.uuid);
        recordPlayCard(game, player, card);
        player.mana -= effectiveCost;
        recordManaSpent(player, effectiveCost);
        recordWeaponPlayed(player);

        withNarrativeRecorder((recorder) => {
            beginLoggedBeat(game, "PLAY_CARD");
            recorder.recordEffect({
                type: "MOVE_CARD",
                cardUuid: card.uuid,
                owner: spotOwner,
                from: "HAND",
                to: { type: "HERO_WEAPON", owner: spotOwner },
            });
            recorder.recordEffect({ type: "SPEND_MANA", owner: spotOwner, amount: effectiveCost });
        });

        const { gameEnded } = triggerPlayCardPassives(game, player, card);
        endCurrentBeat(game);

        if (gameEnded) {
            await terminateGame(game, { skipSendUpdate: true });
        }
    });
};
