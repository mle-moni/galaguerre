import type { ApiGame, GameData, PlayerCard, SpotOwner } from "#api_types/game.types";
import type { NarrativeBeat, NarrativeEffect } from "#api_types/game_narrative.types";
import type { PlayedCardRevealVariant } from "~/stores/PlayedCardRevealStore";

export type CardRevealFromBeat = {
    card: PlayerCard;
    playerId: number;
    variant: PlayedCardRevealVariant;
};

const findCardInGameData = (gameData: GameData, cardUuid: string): PlayerCard | undefined => {
    for (const player of [gameData.playerOne, gameData.playerTwo]) {
        const fromHand = player.hand.find((card) => card.uuid === cardUuid);
        if (fromHand) return fromHand;

        for (const minion of player.board) {
            if (minion.uuid === cardUuid) return minion.originalCard;
            if (minion.originalCard.uuid === cardUuid) return minion.originalCard;
        }

        if (player.weaponState?.originalCard.uuid === cardUuid) {
            return player.weaponState.originalCard;
        }
    }

    return undefined;
};

const getPlayerIdForOwner = (
    gameData: GameData,
    owner: SpotOwner,
    viewerUserId: number,
): number => {
    const meIsPlayerOne = gameData.playerOne.userId === viewerUserId;
    const isMe = owner === "PLAYER";

    if (meIsPlayerOne) {
        return isMe ? gameData.playerOne.userId : gameData.playerTwo.userId;
    }

    return isMe ? gameData.playerTwo.userId : gameData.playerOne.userId;
};

const extractPlayCardFromBeat = (
    beat: NarrativeBeat,
    authoritativeGame: ApiGame,
    viewerUserId: number,
): CardRevealFromBeat | null => {
    if (beat.logEntryId) {
        const entry = authoritativeGame.data.actionLog?.find(
            (logEntry) => logEntry.id === beat.logEntryId,
        );
        if (entry?.type === "PLAY_CARD" && entry.card) {
            return { card: entry.card, playerId: entry.playerId, variant: "played" };
        }
    }

    const moveFromHand = beat.effects.find(
        (effect): effect is Extract<NarrativeEffect, { type: "MOVE_CARD" }> =>
            effect.type === "MOVE_CARD" && effect.from === "HAND",
    );
    if (!moveFromHand) return null;

    const card =
        findCardInGameData(authoritativeGame.data, moveFromHand.cardUuid) ??
        findCardInGameData(beat.stateAfter, moveFromHand.cardUuid);
    if (!card || card.label === "dummy card") return null;

    return {
        card,
        playerId: getPlayerIdForOwner(authoritativeGame.data, moveFromHand.owner, viewerUserId),
        variant: "played",
    };
};

const extractCastWhenDrawnFromBeat = (
    beat: NarrativeBeat,
    authoritativeGame: ApiGame,
    viewerUserId: number,
): CardRevealFromBeat | null => {
    if (beat.logEntryId) {
        const entry = authoritativeGame.data.actionLog?.find(
            (logEntry) => logEntry.id === beat.logEntryId,
        );
        if (entry?.type === "CAST_WHEN_DRAWN" && entry.card) {
            return { card: entry.card, playerId: entry.playerId, variant: "castWhenDrawn" };
        }
    }

    const moveFromDeck = beat.effects.find(
        (effect): effect is Extract<NarrativeEffect, { type: "MOVE_CARD" }> =>
            effect.type === "MOVE_CARD" && effect.from === "DECK",
    );
    if (!moveFromDeck) return null;

    const card =
        findCardInGameData(authoritativeGame.data, moveFromDeck.cardUuid) ??
        findCardInGameData(beat.stateAfter, moveFromDeck.cardUuid);
    if (!card || card.label === "dummy card") return null;

    return {
        card,
        playerId: getPlayerIdForOwner(authoritativeGame.data, moveFromDeck.owner, viewerUserId),
        variant: "castWhenDrawn",
    };
};

const extractOverdrawFromBeat = (
    beat: NarrativeBeat,
    authoritativeGame: ApiGame,
    viewerUserId: number,
): CardRevealFromBeat | null => {
    if (beat.logEntryId) {
        const entry = authoritativeGame.data.actionLog?.find(
            (logEntry) => logEntry.id === beat.logEntryId,
        );
        if (entry?.type === "OVERDRAW" && entry.card) {
            return { card: entry.card, playerId: entry.playerId, variant: "overdraw" };
        }
    }

    const overdrawEffect = beat.effects.find(
        (effect): effect is Extract<NarrativeEffect, { type: "OVERDRAW" }> =>
            effect.type === "OVERDRAW",
    );
    if (!overdrawEffect) return null;

    return {
        card: overdrawEffect.card,
        playerId: getPlayerIdForOwner(authoritativeGame.data, overdrawEffect.owner, viewerUserId),
        variant: "overdraw",
    };
};

export const extractCardRevealFromBeat = (
    beat: NarrativeBeat,
    authoritativeGame: ApiGame,
    viewerUserId: number,
): CardRevealFromBeat | null => {
    if (beat.kind === "PLAY_CARD") {
        return extractPlayCardFromBeat(beat, authoritativeGame, viewerUserId);
    }

    if (beat.kind === "OVERDRAW") {
        return extractOverdrawFromBeat(beat, authoritativeGame, viewerUserId);
    }

    if (beat.kind === "CAST_WHEN_DRAWN") {
        return extractCastWhenDrawnFromBeat(beat, authoritativeGame, viewerUserId);
    }

    return null;
};

/** @deprecated Use extractCardRevealFromBeat */
export const extractPlayedCardFromBeat = (
    beat: NarrativeBeat,
    authoritativeGame: ApiGame,
    viewerUserId: number,
): { card: PlayerCard; playerId: number } | null => {
    const reveal = extractCardRevealFromBeat(beat, authoritativeGame, viewerUserId);
    if (!reveal || reveal.variant !== "played") return null;
    return { card: reveal.card, playerId: reveal.playerId };
};
