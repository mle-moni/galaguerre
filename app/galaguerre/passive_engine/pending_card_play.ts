import type {
    GamePlayer,
    PassiveTriggersOn,
    PendingPassiveTrigger,
    PlayerCard,
} from "#api_types/game.types";
import type Game from "#models/game";
import { findMinionOnPlayerBoard } from "../action_engine/find_minion_on_board.js";
import { recordCardPlayedThisTurn } from "../combo/combo_state.js";
import { findPlayerByUserId } from "../discover/discover_types.js";
import { collectPassiveTriggers, type PassiveTriggerEntry } from "./collect_passive_triggers.js";
import { executePassiveActions } from "./execute_passive_actions.js";

export interface CardPlayPassivesResult {
    gameEnded: boolean;
    discoverPending: boolean;
}

/**
 * Queues the passives that will react to a card being played, *before* that card resolves
 * (Hearthstone trigger queue semantics).
 *
 * Queueing up front is what makes a "DevOps en Sueur" killed by the very spell it reacts to
 * still deal its damage, and what stops a minion summoned by that spell from reacting to it.
 */
export const queueCardPlayPassives = (
    game: Game,
    player: GamePlayer,
    card: PlayerCard,
    triggersOn: Extract<PassiveTriggersOn, "PLAY_CARD" | "SUMMON">,
): PassiveTriggerEntry[] => collectPassiveTriggers(game, triggersOn, player, card);

/**
 * A queued passive is dropped only if its source is still on the board and got silenced while
 * the card was resolving. A source that left the board (killed by the card it reacts to) keeps
 * its queued trigger.
 */
const isSourceSilencedSinceQueued = (entry: PassiveTriggerEntry): boolean => {
    const minion = findMinionOnPlayerBoard(entry.owner, entry.sourceMinionUuid);
    return minion?.isSilenced === true;
};

const toPendingPassiveTriggers = (entries: PassiveTriggerEntry[]): PendingPassiveTrigger[] =>
    entries.map((entry) => ({
        ownerUserId: entry.owner.userId,
        sourceOwner: entry.sourceOwner,
        sourceMinionUuid: entry.sourceMinionUuid,
        passive: entry.passive,
        sourceCard: entry.sourceCard,
    }));

const toPassiveTriggerEntries = (
    game: Game,
    pendingTriggers: PendingPassiveTrigger[],
): PassiveTriggerEntry[] => {
    const entries: PassiveTriggerEntry[] = [];

    for (const pendingTrigger of pendingTriggers) {
        const owner = findPlayerByUserId(game, pendingTrigger.ownerUserId);
        if (!owner) continue;

        entries.push({
            passive: pendingTrigger.passive,
            owner,
            sourceOwner: pendingTrigger.sourceOwner,
            sourceMinionUuid: pendingTrigger.sourceMinionUuid,
            sourceCard: pendingTrigger.sourceCard,
        });
    }

    return entries;
};

/**
 * Stores what is left of a card play interrupted by a discover, so it can be finished once the
 * player has picked a card (see `completePendingCardPlay`).
 */
export const deferCardPlayPassives = (
    game: Game,
    player: GamePlayer,
    entries: PassiveTriggerEntry[],
    options: { recordCardPlayed: boolean },
): void => {
    game.data.pendingCardPlay = {
        playerUserId: player.userId,
        recordCardPlayed: options.recordCardPlayed,
        queuedPassives: toPendingPassiveTriggers(entries),
    };
};

/** Resolves passives queued when the card was played, once the card itself is done resolving. */
export const runQueuedCardPlayPassives = (
    game: Game,
    player: GamePlayer,
    entries: PassiveTriggerEntry[],
): CardPlayPassivesResult => {
    const triggerableEntries = entries.filter((entry) => !isSourceSilencedSinceQueued(entry));
    const result = executePassiveActions(game, triggerableEntries);

    if (result.discoverPending) {
        deferCardPlayPassives(game, player, result.remainingEntries ?? [], {
            recordCardPlayed: false,
        });
    }

    return { gameEnded: result.gameEnded, discoverPending: result.discoverPending };
};

export const clearPendingCardPlay = (game: Game): void => {
    game.data.pendingCardPlay = undefined;
};

/**
 * Finishes a card play that was interrupted by a discover: counts the card for combo and
 * resolves the passives queued when it was played.
 */
export const completePendingCardPlay = (game: Game): CardPlayPassivesResult => {
    const pending = game.data.pendingCardPlay;
    if (!pending) return { gameEnded: false, discoverPending: false };

    clearPendingCardPlay(game);

    const player = findPlayerByUserId(game, pending.playerUserId);
    if (!player) return { gameEnded: false, discoverPending: false };

    if (pending.recordCardPlayed) {
        recordCardPlayedThisTurn(player);
    }

    return runQueuedCardPlayPassives(
        game,
        player,
        toPassiveTriggerEntries(game, pending.queuedPassives),
    );
};
