import type { DiscoverContinuation, GamePlayer, PlayerCard } from "#api_types/game.types";
import type Game from "#models/game";
import { gameEntityUuid } from "../../utils/random.js";
import { instantiateDeckCard } from "../deck_card_operations.js";
import { drawSpecificDeckCard } from "../draw_cards.js";
import { giveCardToHand } from "../give_card_to_hand.js";
import { beginLoggedBeat, endCurrentBeat } from "../game_narrative/narrative_beats.js";
import { resolveSpotOwner } from "../game_narrative/narrative_effects.js";
import { withNarrativeRecorder } from "../game_narrative/narrative_context.js";
import { randomIntInRange } from "../../utils/random.js";
import { resumeDiscoverContinuation } from "./resume_discover_continuation.js";
import { completePendingCardPlay } from "../passive_engine/pending_card_play.js";
import { findPlayerByUserId } from "./discover_types.js";

const isGameOver = (game: Game): boolean =>
    game.data.playerOne.health <= 0 || game.data.playerTwo.health <= 0;

const buildChosenCard = (
    option: PlayerCard,
    pending: NonNullable<Game["data"]["pendingDiscover"]>,
): PlayerCard | undefined => {
    const template = instantiateDeckCard(option.cardId);
    if (!template) return undefined;

    const isOpponentDeckDiscover = pending.discoverSource === "OPPONENT_DECK";

    return {
        ...template,
        uuid: isOpponentDeckDiscover ? gameEntityUuid() : option.uuid,
        isGolden: option.isGolden,
        generatedBy: {
            cardId: pending.sourceCardId,
            label: pending.sourceCardLabel,
        },
    };
};

const drawChosenCardForOpponent = (
    game: Game,
    pending: NonNullable<Game["data"]["pendingDiscover"]>,
    option: PlayerCard,
): void => {
    if (!pending.enemyDrawsChosenCard || !pending.opponentUserId) return;

    const opponent = findPlayerByUserId(game, pending.opponentUserId);
    if (!opponent) return;

    drawSpecificDeckCard(opponent, option.uuid, game);
};

export const resolveDiscoverChoice = (
    game: Game,
    player: GamePlayer,
    cardUuid: string,
): { gameEnded: boolean; discoverPending: boolean } => {
    const pending = game.data.pendingDiscover;
    if (!pending || pending.playerUserId !== player.userId) {
        return { gameEnded: false, discoverPending: Boolean(pending) };
    }

    const option = pending.options.find((candidate) => candidate.uuid === cardUuid);
    if (!option) {
        return { gameEnded: false, discoverPending: true };
    }

    const chosenCard = buildChosenCard(option, pending);
    const continuation = pending.continuation;
    const source = {
        cardId: pending.sourceCardId,
        label: pending.sourceCardLabel,
        uuid: pending.sourceCardUuid,
    };

    if (!chosenCard) {
        game.data.pendingDiscover = undefined;
        return resumeAndFinishCardPlay(game, player, continuation, source);
    }

    const owner = resolveSpotOwner(game, player);
    giveCardToHand(player, chosenCard, game, { source: "GENERATED" });
    drawChosenCardForOpponent(game, pending, option);

    withNarrativeRecorder((recorder) => {
        beginLoggedBeat(game, "TRIGGER");
        recorder.recordEffect({
            type: "DISCOVER_RESOLVE",
            owner,
            chosenCardUuid: chosenCard.uuid,
            generatedBy: {
                cardId: pending.sourceCardId,
                label: pending.sourceCardLabel,
            },
        });
        endCurrentBeat(game);
    });

    game.data.pendingDiscover = undefined;

    if (isGameOver(game)) {
        return { gameEnded: true, discoverPending: false };
    }

    return resumeAndFinishCardPlay(game, player, continuation, source);
};

/**
 * Resumes the interrupted effect, then finishes the card play it belonged to (combo counter and
 * passives queued when the card was played) if nothing else is pending.
 */
const resumeAndFinishCardPlay = (
    game: Game,
    player: GamePlayer,
    continuation: DiscoverContinuation,
    source: { cardId: number; label: string; uuid: string },
): { gameEnded: boolean; discoverPending: boolean } => {
    const result = resumeDiscoverContinuation(game, player, continuation, source);
    if (result.gameEnded || result.discoverPending) return result;

    return completePendingCardPlay(game);
};

export const autoResolvePendingDiscover = (
    game: Game,
): { gameEnded: boolean; discoverPending: boolean } => {
    const pending = game.data.pendingDiscover;
    if (!pending || pending.options.length === 0) {
        game.data.pendingDiscover = undefined;
        return completePendingCardPlay(game);
    }

    const player = findPlayerByUserId(game, pending.playerUserId);
    if (!player) {
        game.data.pendingDiscover = undefined;
        return completePendingCardPlay(game);
    }

    const randomIndex = randomIntInRange(0, pending.options.length - 1);
    const chosenUuid = pending.options[randomIndex]!.uuid;
    return resolveDiscoverChoice(game, player, chosenUuid);
};

export const autoResolveAllPendingDiscovers = (game: Game): { gameEnded: boolean } => {
    while (game.data.pendingDiscover) {
        const { gameEnded } = autoResolvePendingDiscover(game);
        if (gameEnded) return { gameEnded: true };
    }

    return { gameEnded: false };
};
