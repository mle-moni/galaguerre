import type { GamePlayer, PlayerCard } from "#api_types/game.types";
import type Game from "#models/game";
import { instantiateDeckCard } from "../deck_card_operations.js";
import { giveCardToHand } from "../give_card_to_hand.js";
import { beginLoggedBeat, endCurrentBeat } from "../game_narrative/narrative_beats.js";
import { resolveSpotOwner } from "../game_narrative/narrative_effects.js";
import { withNarrativeRecorder } from "../game_narrative/narrative_context.js";
import { randomIntInRange } from "../../utils/random.js";
import { resumeDiscoverContinuation } from "./resume_discover_continuation.js";
import { findPlayerByUserId } from "./discover_types.js";

const isGameOver = (game: Game): boolean =>
    game.data.playerOne.health <= 0 || game.data.playerTwo.health <= 0;

const buildChosenCard = (
    option: PlayerCard,
    pending: NonNullable<Game["data"]["pendingDiscover"]>,
): PlayerCard | undefined => {
    const template = instantiateDeckCard(option.cardId);
    if (!template) return undefined;

    return {
        ...template,
        uuid: option.uuid,
        generatedBy: {
            cardId: pending.sourceCardId,
            label: pending.sourceCardLabel,
        },
    };
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
        return resumeDiscoverContinuation(game, player, continuation, source);
    }

    const owner = resolveSpotOwner(game, player);
    giveCardToHand(player, chosenCard, game, { source: "GENERATED" });

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

    return resumeDiscoverContinuation(game, player, continuation, source);
};

export const autoResolvePendingDiscover = (
    game: Game,
): { gameEnded: boolean; discoverPending: boolean } => {
    const pending = game.data.pendingDiscover;
    if (!pending || pending.options.length === 0) {
        game.data.pendingDiscover = undefined;
        return { gameEnded: false, discoverPending: false };
    }

    const player = findPlayerByUserId(game, pending.playerUserId);
    if (!player) {
        game.data.pendingDiscover = undefined;
        return { gameEnded: false, discoverPending: false };
    }

    const randomIndex = randomIntInRange(0, pending.options.length - 1);
    const chosenUuid = pending.options[randomIndex]!.uuid;
    return resolveDiscoverChoice(game, player, chosenUuid);
};
