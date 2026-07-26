import {
    getAllCardTemplates,
    getCardPreviewById,
    isCardCollectible,
} from "#api_types/card_preview";
import { deckCardMatchesFilter, cardFilterLabelTags } from "#api_types/card_filter_matching";
import type { CardActionSnapshot, CardFilterSnapshot, PlayerCard } from "#api_types/game.types";

const collectActionsFromCard = (card: PlayerCard): CardActionSnapshot[] => {
    switch (card.type) {
        case "MINION":
            return [
                ...card.battlecryActions,
                ...card.comboActions,
                ...card.deathrattleActions,
                ...card.attackActions,
                ...card.passives.flatMap((passive) => (passive.action ? [passive.action] : [])),
            ];
        case "SPELL":
            return [...card.spellActions];
        case "WEAPON":
            return [...card.deathrattleActions, ...card.heroAttackActions];
    }
};

const addNonCollectibleDiscoverMatches = (
    filter: CardFilterSnapshot | null | undefined,
    into: Set<number>,
): void => {
    if (!filter) return;
    if (cardFilterLabelTags(filter).length === 0) return;

    for (const template of getAllCardTemplates()) {
        if (isCardCollectible(template.cardId)) continue;
        if (!deckCardMatchesFilter(template, filter)) continue;
        into.add(template.cardId);
    }
};

const collectReferencedCardIdsFromAction = (
    action: CardActionSnapshot,
    into: Set<number>,
): void => {
    switch (action.type) {
        case "SUMMON": {
            if (action.summonParameters.cardId !== null) {
                into.add(action.summonParameters.cardId);
            }
            if (action.summonCountScale?.cardId !== undefined) {
                into.add(action.summonCountScale.cardId);
            }
            break;
        }
        case "HAND_CARD":
            into.add(action.cardId);
            break;
        case "DECK_CARD":
            if (action.cardId !== null) {
                into.add(action.cardId);
            }
            break;
        case "RECONVERSION":
            if (action.reconvertParameters.cardId !== null) {
                into.add(action.reconvertParameters.cardId);
            }
            break;
        case "DISCOVER":
            addNonCollectibleDiscoverMatches(action.discoverCardFilter, into);
            for (const alternative of action.discoverCardFilterAlternatives) {
                addNonCollectibleDiscoverMatches(alternative, into);
            }
            break;
        default:
            break;
    }

    if (action.onTargetResult?.action) {
        collectReferencedCardIdsFromAction(
            action.onTargetResult.action as CardActionSnapshot,
            into,
        );
    }
};

const getDirectRelatedNonCollectibleCardIds = (cardId: number): number[] => {
    const card = getCardPreviewById(cardId);
    if (!card) return [];

    const referenced = new Set<number>();
    for (const action of collectActionsFromCard(card)) {
        collectReferencedCardIdsFromAction(action, referenced);
    }

    return [...referenced].filter((id) => !isCardCollectible(id));
};

/**
 * Extends owned golden card IDs with linked non-collectible tokens
 * (summons, hand/deck adds, reconversions, discover labelTag pools), transitively.
 */
export const expandOwnedGoldenCardIds = (ownedGoldenCardIds: readonly number[]): number[] => {
    if (ownedGoldenCardIds.length === 0) return [];

    const result = new Set<number>(ownedGoldenCardIds);
    const queue = [...ownedGoldenCardIds];

    while (queue.length > 0) {
        const cardId = queue.pop()!;
        for (const relatedId of getDirectRelatedNonCollectibleCardIds(cardId)) {
            if (result.has(relatedId)) continue;
            result.add(relatedId);
            queue.push(relatedId);
        }
    }

    return [...result];
};
