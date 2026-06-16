import type { CardActionFieldsSnapshot, GamePlayer, PlayerCard } from "#api_types/game.types";
import type Game from "#models/game";
import { randomUUID } from "node:crypto";
import type { GalaguerreDeckPlacement } from "./galaguerre.types.js";
import { getCardPreviewById } from "./card_catalog.js";
import { randomIntInRange } from "../utils/random.js";

export const instantiateDeckCard = (cardId: number): PlayerCard | undefined => {
    const template = getCardPreviewById(cardId);
    if (!template) return undefined;

    return {
        ...template,
        uuid: randomUUID(),
    };
};

const insertCardAtPlacement = (
    deck: PlayerCard[],
    card: PlayerCard,
    placement: GalaguerreDeckPlacement,
): void => {
    switch (placement) {
        case "TOP":
            deck.unshift(card);
            break;
        case "BOTTOM":
            deck.push(card);
            break;
        case "RANDOM": {
            const index = randomIntInRange(0, deck.length);
            deck.splice(index, 0, card);
            break;
        }
    }
};

export const addCardsToDeck = (
    player: GamePlayer,
    cardId: number,
    copyCount: number,
    placement: GalaguerreDeckPlacement,
): number => {
    let added = 0;

    for (let i = 0; i < copyCount; i++) {
        const card = instantiateDeckCard(cardId);
        if (!card) break;

        insertCardAtPlacement(player.deckCards, card, placement);
        added++;
    }

    return added;
};

const findMatchingIndices = (deck: PlayerCard[], cardId: number): number[] => {
    const indices: number[] = [];
    for (let index = 0; index < deck.length; index++) {
        if (deck[index]!.cardId === cardId) {
            indices.push(index);
        }
    }
    return indices;
};

const pickRemovalIndex = (
    indices: number[],
    placement: GalaguerreDeckPlacement,
): number | undefined => {
    if (indices.length === 0) return undefined;

    switch (placement) {
        case "TOP":
            return indices[0];
        case "BOTTOM":
            return indices[indices.length - 1];
        case "RANDOM":
            return indices[randomIntInRange(0, indices.length - 1)];
    }
};

export const removeCardsFromDeck = (
    player: GamePlayer,
    cardId: number,
    copyCount: number | null,
    placement: GalaguerreDeckPlacement | null,
): number => {
    if (copyCount === null) {
        const before = player.deckCards.length;
        player.deckCards = player.deckCards.filter((card) => card.cardId !== cardId);
        return before - player.deckCards.length;
    }

    let removed = 0;

    for (let i = 0; i < copyCount; i++) {
        const indices = findMatchingIndices(player.deckCards, cardId);
        const indexToRemove = pickRemovalIndex(indices, placement!);
        if (indexToRemove === undefined) break;

        player.deckCards.splice(indexToRemove, 1);
        removed++;
    }

    return removed;
};

const applyDeckCardOperationToPlayer = (
    targetPlayer: GamePlayer,
    action: Extract<CardActionFieldsSnapshot, { type: "DECK_CARD" }>,
): void => {
    if (action.deckCardOperation === "ADD") {
        addCardsToDeck(targetPlayer, action.cardId, action.copyCount!, action.deckPlacement!);
        return;
    }

    removeCardsFromDeck(targetPlayer, action.cardId, action.copyCount, action.deckPlacement);
};

export const executeDeckCardAction = (
    action: Extract<CardActionFieldsSnapshot, { type: "DECK_CARD" }>,
    _game: Game,
    player: GamePlayer,
    opponent: GamePlayer,
): void => {
    switch (action.deckTargetTeam) {
        case "PLAYER":
            applyDeckCardOperationToPlayer(player, action);
            break;
        case "OPPONENT":
            applyDeckCardOperationToPlayer(opponent, action);
            break;
        case "ALL":
            applyDeckCardOperationToPlayer(player, action);
            applyDeckCardOperationToPlayer(opponent, action);
            break;
    }
};
