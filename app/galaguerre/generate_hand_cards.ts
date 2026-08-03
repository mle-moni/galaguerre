import type {
    CardActionFieldsSnapshot,
    CardFilterSnapshot,
    GamePlayer,
    PlayerCard,
} from "#api_types/game.types";
import { deckCardMatchesFilter } from "#api_types/card_filter_matching";
import { getCollectibleCardTemplates } from "#api_types/card_preview";
import type Game from "#models/game";
import { gameEntityUuid } from "../utils/random.js";
import { randomIntInRange } from "../utils/random.js";
import { giveCardToHand } from "./give_card_to_hand.js";

const filterCardTemplates = (filter: CardFilterSnapshot): PlayerCard[] =>
    getCollectibleCardTemplates().filter((template) => deckCardMatchesFilter(template, filter));

const instantiateRandomTemplate = (template: PlayerCard): PlayerCard => ({
    ...template,
    uuid: gameEntityUuid(),
});

const pickRandomCardFromFilter = (filter: CardFilterSnapshot): PlayerCard | undefined => {
    const matches = filterCardTemplates(filter);
    if (matches.length === 0) return undefined;

    return instantiateRandomTemplate(matches[randomIntInRange(0, matches.length - 1)]!);
};

export const generateOneCardToHand = (
    player: GamePlayer,
    filter?: CardFilterSnapshot | null,
    game?: Game,
): void => {
    if (!filter) {
        const templates = getCollectibleCardTemplates();
        if (templates.length === 0) return;

        const card = instantiateRandomTemplate(
            templates[randomIntInRange(0, templates.length - 1)]!,
        );
        giveCardToHand(player, card, game, { source: "GENERATED" });
        return;
    }

    const card = pickRandomCardFromFilter(filter);
    if (!card) return;

    giveCardToHand(player, card, game, { source: "GENERATED" });
};

export const generateOneCardToHandWithOrFilters = (
    player: GamePlayer,
    filters: CardFilterSnapshot[],
    game?: Game,
): void => {
    if (filters.length === 0) {
        generateOneCardToHand(player, null, game);
        return;
    }

    const startIndex = randomIntInRange(0, filters.length - 1);
    for (let i = 0; i < filters.length; i++) {
        const filter = filters[(startIndex + i) % filters.length]!;
        const card = pickRandomCardFromFilter(filter);
        if (!card) continue;

        giveCardToHand(player, card, game, { source: "GENERATED" });
        return;
    }
};

export const generateCardsToHand = (
    player: GamePlayer,
    count: number,
    filter?: CardFilterSnapshot | null,
    game?: Game,
    filterAlternatives?: CardFilterSnapshot[] | null,
): void => {
    for (let i = 0; i < count; i++) {
        if (filterAlternatives && filterAlternatives.length > 0) {
            generateOneCardToHandWithOrFilters(player, filterAlternatives, game);
        } else {
            generateOneCardToHand(player, filter, game);
        }
    }
};

export const executeGenerateHandAction = (
    action: Extract<CardActionFieldsSnapshot, { type: "GENERATE_HAND" }>,
    game: Game,
    player: GamePlayer,
    opponent: GamePlayer,
): void => {
    const applyToPlayer = (targetPlayer: GamePlayer) => {
        generateCardsToHand(
            targetPlayer,
            action.generateCount,
            action.generateCardFilter,
            game,
            action.generateCardFilterAlternatives,
        );
    };

    switch (action.handTargetTeam) {
        case "PLAYER":
            applyToPlayer(player);
            break;
        case "OPPONENT":
            applyToPlayer(opponent);
            break;
        case "ALL":
            applyToPlayer(player);
            applyToPlayer(opponent);
            break;
    }
};
