import type { GamePlayer } from "#api_types/game.types";
import type Game from "#models/game";
import { executeWeaponDeathrattles } from "../../../galaguerre/action_engine/execute_weapon_deathrattles.js";
import { recordWeaponBreak } from "../../../galaguerre/game_log/record_game_log.js";
import {
    beginLoggedBeat,
    endCurrentBeat,
} from "../../../galaguerre/game_narrative/narrative_beats.js";
import { resolveSpotOwner } from "../../../galaguerre/game_narrative/narrative_effects.js";
import { withNarrativeRecorder } from "../../../galaguerre/game_narrative/narrative_context.js";

export const breakWeapon = (game: Game, player: GamePlayer): { gameEnded: boolean } => {
    const weaponState = player.weaponState;
    if (!weaponState) return { gameEnded: false };

    const card = weaponState.originalCard;
    const owner = resolveSpotOwner(game, player);

    recordWeaponBreak(game, player, card);

    withNarrativeRecorder((recorder) => {
        beginLoggedBeat(game, "WEAPON_BREAK");
        recorder.recordEffect({ type: "BREAK_WEAPON", cardUuid: card.uuid, owner });
    });

    const { gameEnded } = executeWeaponDeathrattles(game, player, card);

    player.weaponState = null;

    withNarrativeRecorder(() => {
        endCurrentBeat(game);
    });

    return { gameEnded };
};
