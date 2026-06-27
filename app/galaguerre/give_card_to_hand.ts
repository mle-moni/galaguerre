import type { GamePlayer, PlayerCard } from "#api_types/game.types";
import type Game from "#models/game";
import { recordOverdraw } from "./game_log/record_game_log.js";
import { beginLoggedBeat, endCurrentBeat } from "./game_narrative/narrative_beats.js";
import { resolveSpotOwner } from "./game_narrative/narrative_effects.js";
import { withNarrativeRecorder } from "./game_narrative/narrative_context.js";
import { isHandFull } from "./game_rules.js";

export type GiveCardToHandSource = "DECK" | "GENERATED";

export type GiveCardToHandResult = "added" | "overdrawn";

const recordOverdrawBeat = (
    game: Game,
    player: GamePlayer,
    card: PlayerCard,
    source: GiveCardToHandSource,
): void => {
    const owner = resolveSpotOwner(game, player);
    const cardSnapshot = structuredClone(card);
    withNarrativeRecorder((recorder) => {
        beginLoggedBeat(game, "OVERDRAW");
        recorder.recordEffect({ type: "OVERDRAW", owner, card: cardSnapshot, source });
        endCurrentBeat(game);
    });
};

const burnCardFromHandAttempt = (
    player: GamePlayer,
    card: PlayerCard,
    game: Game | undefined,
    source: GiveCardToHandSource,
): void => {
    if (game) {
        recordOverdraw(game, player, card);
        recordOverdrawBeat(game, player, card, source);
    }
};

export const giveCardToHand = (
    player: GamePlayer,
    card: PlayerCard,
    game: Game | undefined,
    { source }: { source: GiveCardToHandSource },
): GiveCardToHandResult => {
    if (!isHandFull(player)) {
        player.hand.push(card);
        return "added";
    }

    burnCardFromHandAttempt(player, card, game, source);
    return "overdrawn";
};
