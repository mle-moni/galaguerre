import type { GameData, GameLogEntry, GamePlayer, PlayerCard } from "#api_types/game.types";
import type { GamePresentationUpdate, NarrativeBeat } from "#api_types/game_narrative.types";
import { remapEffectForUser } from "./remap_narrative_for_user.js";

const hideCardData = (card: PlayerCard): PlayerCard => ({
    type: "MINION",
    attack: 0,
    health: 0,
    minionPowers: {},
    effects: [],
    tags: [],
    description: "",
    battlecryActions: [],
    deathrattleActions: [],
    passives: [],
    cost: 0,
    baseCost: 0,
    dynamicCost: null,
    label: "dummy card",
    imageUrl: "https://picsum.photos/seed/dummy_card/200/300",
    uuid: card.uuid,
    cardId: 0,
});

const hideActionLogForUser = (actionLog: GameLogEntry[], forUserId: number): GameLogEntry[] =>
    actionLog.map((entry) => {
        if (entry.type === "DRAW" && entry.card && entry.playerId !== forUserId) {
            return { ...entry, card: hideCardData(entry.card) };
        }

        return entry;
    });

export const hidePlayerDataForUser = (player: GamePlayer, forUserId: number): GamePlayer => {
    const deckCards = player.deckCards.map(hideCardData);
    const hiddenHand = player.hand.map(hideCardData);

    return {
        ...player,
        deckCards,
        hand: player.userId === forUserId ? player.hand : hiddenHand,
    };
};

export const hideGameDataForUser = (data: GameData, forUserId: number): GameData => {
    const playerOne = hidePlayerDataForUser(data.playerOne, forUserId);
    const playerTwo = hidePlayerDataForUser(data.playerTwo, forUserId);
    const actionLog = hideActionLogForUser(data.actionLog, forUserId);

    return {
        ...data,
        playerOne,
        playerTwo,
        actionLog,
    };
};

const filterBeatForUser = (
    beat: NarrativeBeat,
    forUserId: number,
    playerOneUserId: number,
): NarrativeBeat => ({
    ...beat,
    effects: beat.effects.map((effect) => remapEffectForUser(effect, forUserId, playerOneUserId)),
    stateAfter: hideGameDataForUser(beat.stateAfter, forUserId),
});

export const filterPresentationForUser = (
    presentation: GamePresentationUpdate,
    forUserId: number,
): GamePresentationUpdate => {
    const playerOneUserId = presentation.stateBefore.playerOne.userId;

    return {
        ...presentation,
        stateBefore: hideGameDataForUser(presentation.stateBefore, forUserId),
        stateAfter: hideGameDataForUser(presentation.stateAfter, forUserId),
        beats: presentation.beats.map((beat) =>
            filterBeatForUser(beat, forUserId, playerOneUserId),
        ),
    };
};
