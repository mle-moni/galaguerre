import type { GamePlayer, SpellCard } from "#api_types/game.types";
import type Game from "#models/game";
import { executeSpellEffect } from "../action_engine/execute_spell_effect.js";
import { cardRequiresActionTarget } from "../action_engine/requires_action_target.js";
import { pickRandomPlayableTarget } from "../action_engine/pick_random_playable_target.js";
import {
    deferCardPlayPassives,
    queueCardPlayPassives,
    runQueuedCardPlayPassives,
} from "../passive_engine/pending_card_play.js";
import { recordCastWhenDrawn } from "../game_log/record_game_log.js";
import { recordSpellCast } from "../game_stats/record_player_stats.js";
import { beginLoggedBeat, endCurrentBeat } from "../game_narrative/narrative_beats.js";
import { resolveSpotOwner } from "../game_narrative/narrative_effects.js";
import { withNarrativeRecorder } from "../game_narrative/narrative_context.js";

const getOpponent = (game: Game, player: GamePlayer): GamePlayer => {
    return player === game.data.playerOne ? game.data.playerTwo : game.data.playerOne;
};

const isGameOver = (game: Game): boolean => {
    return game.data.playerOne.health <= 0 || game.data.playerTwo.health <= 0;
};

export const executeCastWhenDrawn = (
    game: Game,
    player: GamePlayer,
    card: SpellCard,
): { gameEnded: boolean } => {
    const opponent = getOpponent(game, player);
    const spotOwner = resolveSpotOwner(game, player);

    const actionTarget = cardRequiresActionTarget(card)
        ? pickRandomPlayableTarget(card, player, opponent)
        : undefined;

    recordCastWhenDrawn(game, player, card);
    recordSpellCast(player);

    beginLoggedBeat(game, "CAST_WHEN_DRAWN");
    withNarrativeRecorder((recorder) => {
        recorder.recordEffect({
            type: "MOVE_CARD",
            cardUuid: card.uuid,
            owner: spotOwner,
            from: "DECK",
            to: { type: "DISCARD" },
        });
    });

    const queuedPassives = queueCardPlayPassives(game, player, card, "PLAY_CARD");

    const { gameEnded: spellGameEnded, discoverPending } = executeSpellEffect(
        game,
        player,
        card,
        actionTarget,
    );

    endCurrentBeat(game);

    if (spellGameEnded || isGameOver(game)) {
        return { gameEnded: true };
    }

    if (discoverPending) {
        deferCardPlayPassives(game, player, queuedPassives, { recordCardPlayed: false });
        return { gameEnded: false };
    }

    const { gameEnded: playCardPassiveGameEnded } = runQueuedCardPlayPassives(
        game,
        player,
        queuedPassives,
    );

    return { gameEnded: playCardPassiveGameEnded };
};
