import type {
    ApiGame,
    GamePlayer,
    MinionSpotId,
    MinionState,
    PlayerCard,
    SpotOwner,
} from "#api_types/game.types";
import type { AnimationRect, VisualAnimationEventInput } from "~/stores/AnimationStore";
import {
    getFallbackRect,
    getSpotKey,
    type GameAnimationSnapshot,
} from "./game_animation_snapshot.js";

type PendingVisualEvent = VisualAnimationEventInput;

interface MinionRef {
    minion: MinionState;
    owner: SpotOwner;
    rect?: AnimationRect;
}

const OWNERS: SpotOwner[] = ["PLAYER", "OPPONENT"];

const getOwnerForPlayerId = (userId: number, playerId: number): SpotOwner =>
    playerId === userId ? "PLAYER" : "OPPONENT";

const getPlayerForOwner = (game: ApiGame, userId: number, owner: SpotOwner): GamePlayer => {
    const playerOneIsUser = game.data.playerOne.userId === userId;

    if (owner === "PLAYER") {
        return playerOneIsUser ? game.data.playerOne : game.data.playerTwo;
    }

    return playerOneIsUser ? game.data.playerTwo : game.data.playerOne;
};

const getBoardMinions = (
    game: ApiGame,
    userId: number,
    snapshot: GameAnimationSnapshot,
): Map<string, MinionRef> => {
    const minions = new Map<string, MinionRef>();

    for (const owner of OWNERS) {
        const player = getPlayerForOwner(game, userId, owner);
        for (const [spotId, minion] of Object.entries(player.board)) {
            if (!minion) continue;

            minions.set(minion.uuid, {
                minion,
                owner,
                rect:
                    snapshot.cards.get(minion.uuid) ??
                    snapshot.spots.get(getSpotKey(owner, spotId as MinionSpotId)),
            });
        }
    }

    return minions;
};

const getCardDestinationRect = (
    card: PlayerCard,
    owner: SpotOwner,
    nextMinions: Map<string, MinionRef>,
    nextSnapshot: GameAnimationSnapshot,
): AnimationRect => {
    const minionRect = nextMinions.get(card.uuid)?.rect;
    if (minionRect) return minionRect;

    if (card.type === "WEAPON") {
        return getFallbackRect([nextSnapshot.heroes.get(owner), nextSnapshot.hands.get(owner)]);
    }

    return getFallbackRect([
        nextSnapshot.cards.get(card.uuid),
        nextSnapshot.heroes.get(owner),
        nextSnapshot.hands.get(owner),
    ]);
};

const pushFloatingStatEvents = (
    events: PendingVisualEvent[],
    previousGame: ApiGame,
    nextGame: ApiGame,
    userId: number,
    previousSnapshot: GameAnimationSnapshot,
    nextSnapshot: GameAnimationSnapshot,
) => {
    for (const owner of OWNERS) {
        const previousPlayer = getPlayerForOwner(previousGame, userId, owner);
        const nextPlayer = getPlayerForOwner(nextGame, userId, owner);
        const heroRect = getFallbackRect([
            nextSnapshot.heroes.get(owner),
            previousSnapshot.heroes.get(owner),
        ]);
        const heroHealthDelta = nextPlayer.health - previousPlayer.health;

        if (heroHealthDelta < 0) {
            events.push({
                type: "FLOATING_TEXT",
                at: heroRect,
                label: `${heroHealthDelta}`,
                tone: "damage",
            });
        }

        if (heroHealthDelta > 0) {
            events.push({
                type: "FLOATING_TEXT",
                at: heroRect,
                label: `+${heroHealthDelta}`,
                tone: "heal",
            });
        }
    }
};

const pushMinionDeltaEvents = (
    events: PendingVisualEvent[],
    previousMinions: Map<string, MinionRef>,
    nextMinions: Map<string, MinionRef>,
) => {
    for (const [uuid, previousRef] of previousMinions) {
        const nextRef = nextMinions.get(uuid);

        if (!nextRef) {
            if (previousRef.rect) {
                events.push({ type: "DEATH", at: previousRef.rect });
            }
            continue;
        }

        const rect = getFallbackRect([nextRef.rect, previousRef.rect]);
        const healthDelta = nextRef.minion.health - previousRef.minion.health;
        const attackDelta = nextRef.minion.attack - previousRef.minion.attack;
        const maxHealthDelta = nextRef.minion.maxHealth - previousRef.minion.maxHealth;

        if (healthDelta < 0) {
            events.push({
                type: "FLOATING_TEXT",
                at: rect,
                label: `${healthDelta}`,
                tone: "damage",
            });
        }

        if (healthDelta > 0 && attackDelta === 0 && maxHealthDelta === 0) {
            events.push({
                type: "FLOATING_TEXT",
                at: rect,
                label: `+${healthDelta}`,
                tone: "heal",
            });
        }

        if (attackDelta !== 0 || maxHealthDelta !== 0) {
            const attackLabel = attackDelta > 0 ? `+${attackDelta}` : `${attackDelta}`;
            const healthLabel = maxHealthDelta > 0 ? `+${maxHealthDelta}` : `${maxHealthDelta}`;

            events.push({
                type: "FLOATING_TEXT",
                at: rect,
                label: `${attackLabel}/${healthLabel}`,
                tone: "boost",
            });
        }
    }
};

const pushDrawEvents = (
    events: PendingVisualEvent[],
    previousGame: ApiGame,
    nextGame: ApiGame,
    userId: number,
    previousSnapshot: GameAnimationSnapshot,
    nextSnapshot: GameAnimationSnapshot,
) => {
    for (const owner of OWNERS) {
        const previousPlayer = getPlayerForOwner(previousGame, userId, owner);
        const nextPlayer = getPlayerForOwner(nextGame, userId, owner);

        if (nextPlayer.deckCards.length >= previousPlayer.deckCards.length) continue;
        if (nextPlayer.hand.length <= previousPlayer.hand.length) continue;

        const previousHandIds = new Set(previousPlayer.hand.map((card) => card.uuid));
        const drawnCard = nextPlayer.hand.find((card) => !previousHandIds.has(card.uuid));
        const from = getFallbackRect([
            previousSnapshot.decks.get(owner),
            nextSnapshot.decks.get(owner),
            previousSnapshot.hands.get(owner),
        ]);
        const to = getFallbackRect([
            drawnCard ? nextSnapshot.cards.get(drawnCard.uuid) : undefined,
            nextSnapshot.hands.get(owner),
            previousSnapshot.hands.get(owner),
        ]);

        events.push({ type: "DRAW", from, to });
    }
};

const pushLogEvents = (
    events: PendingVisualEvent[],
    previousGame: ApiGame,
    nextGame: ApiGame,
    userId: number,
    previousSnapshot: GameAnimationSnapshot,
    nextSnapshot: GameAnimationSnapshot,
    nextMinions: Map<string, MinionRef>,
) => {
    const previousLogIds = new Set((previousGame.data.actionLog ?? []).map((entry) => entry.id));
    const newEntries = (nextGame.data.actionLog ?? []).filter(
        (entry) => !previousLogIds.has(entry.id),
    );

    for (const entry of newEntries) {
        const owner = getOwnerForPlayerId(userId, entry.playerId);

        if (entry.type === "PLAY_CARD" && entry.card) {
            const from = getFallbackRect([
                previousSnapshot.cards.get(entry.card.uuid),
                previousSnapshot.hands.get(owner),
                nextSnapshot.hands.get(owner),
            ]);
            const to = getCardDestinationRect(entry.card, owner, nextMinions, nextSnapshot);

            events.push({ type: "CARD_FLIGHT", card: entry.card, from, to });
        }

        if (entry.type === "ATTACK" && entry.attackerCard && entry.attackTarget) {
            const from = previousSnapshot.cards.get(entry.attackerCard.uuid);
            const targetOwner =
                entry.attackTarget.playerId !== undefined
                    ? getOwnerForPlayerId(userId, entry.attackTarget.playerId)
                    : null;
            const to =
                (entry.attackTarget.type === "MINION" && entry.attackTarget.card
                    ? previousSnapshot.cards.get(entry.attackTarget.card.uuid) ??
                      nextSnapshot.cards.get(entry.attackTarget.card.uuid)
                    : undefined) ??
                (targetOwner
                    ? nextSnapshot.heroes.get(targetOwner) ??
                      previousSnapshot.heroes.get(targetOwner)
                    : undefined);

            if (from && to) {
                events.push({ type: "ATTACK", card: entry.attackerCard, from, to });
            }
        }
    }
};

const pushTurnEvents = (
    events: PendingVisualEvent[],
    previousGame: ApiGame,
    nextGame: ApiGame,
    userId: number,
    nextSnapshot: GameAnimationSnapshot,
) => {
    if (
        previousGame.data.state === nextGame.data.state &&
        previousGame.data.currentRound === nextGame.data.currentRound
    ) {
        return;
    }

    if (nextGame.data.state === "PLAYER_ONE_TURN" || nextGame.data.state === "PLAYER_TWO_TURN") {
        const activePlayer =
            nextGame.data.state === "PLAYER_ONE_TURN"
                ? nextGame.data.playerOne
                : nextGame.data.playerTwo;
        const owner = getOwnerForPlayerId(userId, activePlayer.userId);

        events.push({
            type: "TURN_BANNER",
            owner,
            label: owner === "PLAYER" ? "Votre tour" : "Tour adverse",
            at: getFallbackRect([nextSnapshot.board]),
        });
    }
};

export const deriveGameAnimationEvents = ({
    previousGame,
    nextGame,
    userId,
    previousSnapshot,
    nextSnapshot,
}: {
    previousGame: ApiGame;
    nextGame: ApiGame;
    userId: number;
    previousSnapshot: GameAnimationSnapshot;
    nextSnapshot: GameAnimationSnapshot;
}): PendingVisualEvent[] => {
    const events: PendingVisualEvent[] = [];
    const previousMinions = getBoardMinions(previousGame, userId, previousSnapshot);
    const nextMinions = getBoardMinions(nextGame, userId, nextSnapshot);

    pushLogEvents(
        events,
        previousGame,
        nextGame,
        userId,
        previousSnapshot,
        nextSnapshot,
        nextMinions,
    );
    pushFloatingStatEvents(events, previousGame, nextGame, userId, previousSnapshot, nextSnapshot);
    pushMinionDeltaEvents(events, previousMinions, nextMinions);
    pushDrawEvents(events, previousGame, nextGame, userId, previousSnapshot, nextSnapshot);
    pushTurnEvents(events, previousGame, nextGame, userId, nextSnapshot);

    return events;
};
