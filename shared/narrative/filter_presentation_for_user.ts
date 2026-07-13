import type {
    GameData,
    GameLogEntry,
    GamePendingDiscover,
    GamePlayer,
    PlayerCard,
} from "#api_types/game.types";
import type { GamePresentationUpdate, NarrativeBeat } from "#api_types/game_narrative.types";
import { normalizePresentationForReplay } from "./normalize_replay_game_data.js";
import { remapEffectForUser } from "./remap_narrative_for_user.js";

const hideCardData = (card: PlayerCard): PlayerCard => ({
    type: "MINION",
    attack: 0,
    health: 0,
    minionPowers: {},
    effects: [],
    tags: [],
    labelTags: [],
    description: "",
    battlecryActions: [],
    deathrattleActions: [],
    attackActions: [],
    passives: [],
    cost: 0,
    baseCost: 0,
    dynamicCost: null,
    label: "dummy card",
    imageUrl: "https://picsum.photos/seed/dummy_card/200/300",
    uuid: card.uuid,
    cardId: 0,
    rarity: "COMMON",
});

const hideActionLogForUser = (
    actionLog: GameLogEntry[] | undefined,
    forUserId: number,
): GameLogEntry[] =>
    (actionLog ?? []).map((entry) => {
        if (entry.type === "DRAW" && entry.card && entry.playerId !== forUserId) {
            return { ...entry, card: hideCardData(entry.card) };
        }

        return entry;
    });

export const hidePlayerDataForUser = (player: GamePlayer, forUserId: number): GamePlayer => {
    const hand = player.hand ?? [];
    const deckCards = (player.deckCards ?? []).map(hideCardData);
    const hiddenHand = hand.map(hideCardData);

    return {
        ...player,
        deckCards,
        hand: player.userId === forUserId ? hand : hiddenHand,
    };
};

export const hideGameDataForUser = (data: GameData, forUserId: number): GameData => {
    const playerOne = hidePlayerDataForUser(data.playerOne, forUserId);
    const playerTwo = hidePlayerDataForUser(data.playerTwo, forUserId);
    const actionLog = hideActionLogForUser(data.actionLog, forUserId);
    const pendingDiscover = hidePendingDiscoverForUser(data.pendingDiscover, forUserId);

    return {
        ...data,
        playerOne,
        playerTwo,
        actionLog,
        pendingDiscover,
    };
};

const hidePendingDiscoverForUser = (
    pendingDiscover: GamePendingDiscover | undefined,
    forUserId: number,
): GamePendingDiscover | undefined => {
    if (!pendingDiscover) return undefined;
    if (pendingDiscover.playerUserId === forUserId) return pendingDiscover;

    return {
        ...pendingDiscover,
        options: pendingDiscover.options.map(hideCardData),
    };
};

const filterBeatForUser = (
    beat: NarrativeBeat,
    forUserId: number,
    playerOneUserId: number,
): NarrativeBeat => ({
    ...beat,
    effects: (beat.effects ?? []).map((effect) =>
        remapEffectForUser(effect, forUserId, playerOneUserId),
    ),
    stateAfter: hideGameDataForUser(beat.stateAfter, forUserId),
});

export const filterPresentationForUser = (
    presentation: GamePresentationUpdate,
    forUserId: number,
): GamePresentationUpdate => {
    const normalized = normalizePresentationForReplay(presentation);
    const playerOneUserId = normalized.stateBefore.playerOne.userId;

    return {
        ...normalized,
        stateBefore: hideGameDataForUser(normalized.stateBefore, forUserId),
        stateAfter: hideGameDataForUser(normalized.stateAfter, forUserId),
        beats: normalized.beats.map((beat) => filterBeatForUser(beat, forUserId, playerOneUserId)),
    };
};
