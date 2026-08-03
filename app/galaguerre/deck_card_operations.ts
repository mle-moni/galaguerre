import type { CardActionFieldsSnapshot, GamePlayer, PlayerCard } from "#api_types/game.types";
import type { PassiveTriggerEvent } from "#api_types/target_matching";
import type Game from "#models/game";
import { gameEntityUuid } from "../utils/random.js";
import type { GalaguerreDeckPlacement } from "./galaguerre.types.js";
import { getCardPreviewById } from "./card_catalog.js";
import { playerOwnsGoldenCard } from "./golden/resolve_is_golden_for_player.js";
import { randomIntInRange } from "../utils/random.js";
import { triggerPassives } from "./passive_engine/trigger_passives.js";

export const instantiateDeckCard = (
    cardId: number,
    ownedGoldenCardIds: readonly number[] = [],
): PlayerCard | undefined => {
    const template = getCardPreviewById(cardId);
    if (!template) return undefined;

    return {
        ...template,
        uuid: gameEntityUuid(),
        isStartingDeckCard: false,
        isGolden: playerOwnsGoldenCard(
            template.cardId,
            template.goldenVideoUrl,
            ownedGoldenCardIds,
        ),
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
    const ownedGoldenCardIds = player.ownedGoldenCardIds ?? [];

    for (let i = 0; i < copyCount; i++) {
        const card = instantiateDeckCard(cardId, ownedGoldenCardIds);
        if (!card) break;

        insertCardAtPlacement(player.deckCards, card, placement);
        added++;
    }

    return added;
};

type AddCardsToDeckWithPassivesOptions = {
    suppressPassives?: boolean;
};

export const addCardsToDeckWithPassives = (
    game: Game,
    targetPlayer: GamePlayer,
    cardId: number,
    copyCount: number,
    placement: GalaguerreDeckPlacement,
    options: AddCardsToDeckWithPassivesOptions = {},
): { added: number; gameEnded: boolean } => {
    let added = 0;
    const ownedGoldenCardIds = targetPlayer.ownedGoldenCardIds ?? [];

    for (let i = 0; i < copyCount; i++) {
        const card = instantiateDeckCard(cardId, ownedGoldenCardIds);
        if (!card) break;

        insertCardAtPlacement(targetPlayer.deckCards, card, placement);
        added++;

        if (!options.suppressPassives) {
            const event: PassiveTriggerEvent = {
                type: "DECK_CARD",
                cardId,
                targetPlayer,
                placement,
            };
            const { gameEnded } = triggerPassives(
                game,
                "DECK_CARD_ADD",
                undefined,
                undefined,
                event,
            );
            if (gameEnded) {
                return { added, gameEnded: true };
            }
        }
    }

    return { added, gameEnded: false };
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

export const removeAddedCardsFromDeck = (player: GamePlayer): number => {
    const before = player.deckCards.length;
    player.deckCards = player.deckCards.filter((card) => card.isStartingDeckCard !== false);
    return before - player.deckCards.length;
};

const applyDeckCardOperationToPlayer = (
    game: Game,
    targetPlayer: GamePlayer,
    action: Extract<CardActionFieldsSnapshot, { type: "DECK_CARD" }>,
): { gameEnded: boolean } => {
    if (action.deckCardOperation === "ADD") {
        if (action.cardId === null) return { gameEnded: false };
        const { gameEnded } = addCardsToDeckWithPassives(
            game,
            targetPlayer,
            action.cardId,
            action.copyCount!,
            action.deckPlacement!,
        );
        return { gameEnded };
    }

    if (action.deckCardOperation === "DELETE_ADDED") {
        removeAddedCardsFromDeck(targetPlayer);
        return { gameEnded: false };
    }

    if (action.cardId === null) return { gameEnded: false };
    removeCardsFromDeck(targetPlayer, action.cardId, action.copyCount, action.deckPlacement);
    return { gameEnded: false };
};

export const executeDeckCardAction = (
    action: Extract<CardActionFieldsSnapshot, { type: "DECK_CARD" }>,
    game: Game,
    player: GamePlayer,
    opponent: GamePlayer,
): { gameEnded: boolean } => {
    switch (action.deckTargetTeam) {
        case "PLAYER":
            return applyDeckCardOperationToPlayer(game, player, action);
        case "OPPONENT":
            return applyDeckCardOperationToPlayer(game, opponent, action);
        case "ALL": {
            const playerResult = applyDeckCardOperationToPlayer(game, player, action);
            if (playerResult.gameEnded) return playerResult;
            return applyDeckCardOperationToPlayer(game, opponent, action);
        }
    }
};
