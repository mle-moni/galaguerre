import {
    type GamePlayer,
    type MinionCard,
    type PassiveSnapshot,
    type PassiveTriggersOn,
    type PlayerCard,
    type SpotOwner,
} from "#api_types/game.types";
import { deckCardMatchesFilter } from "#api_types/card_filter_matching";
import {
    passiveTriggerEventMatchesFilter,
    type PassiveTriggerEvent,
} from "#api_types/target_matching";
import type Game from "#models/game";

export interface PassiveTriggerEntry {
    passive: PassiveSnapshot;
    owner: GamePlayer;
    sourceOwner: SpotOwner;
    sourceMinionUuid: string;
    sourceCard: { cardId: number; label: string; uuid: string };
}

const collectFromBoard = (
    board: GamePlayer["board"],
    owner: GamePlayer,
    sourceOwner: SpotOwner,
    triggersOn: PassiveTriggersOn,
    game: Game,
    activePlayer?: GamePlayer,
    playedCard?: PlayerCard,
    event?: PassiveTriggerEvent,
): PassiveTriggerEntry[] => {
    const entries: PassiveTriggerEntry[] = [];

    for (let boardIndex = 0; boardIndex < board.length; boardIndex++) {
        const minion = board[boardIndex];
        if (minion.originalCard.type !== "MINION" || minion.isSilenced) continue;

        const card = minion.originalCard as MinionCard;
        for (const passive of card.passives ?? []) {
            if (passive.type !== "ACTION" || passive.triggersOn !== triggersOn) continue;
            if (!passive.action) continue;

            if (triggersOn === "PLAY_CARD") {
                if (!playedCard || !activePlayer || owner !== activePlayer) continue;
                if (minion.uuid === playedCard.uuid) continue;
                if (
                    passive.playCardFilter !== null &&
                    !deckCardMatchesFilter(playedCard, passive.playCardFilter)
                ) {
                    continue;
                }
            } else if (triggersOn === "SUMMON") {
                if (!playedCard || !activePlayer || owner !== activePlayer) continue;
                if (minion.uuid === playedCard.uuid) continue;
                if (
                    passive.summonFilter !== null &&
                    !deckCardMatchesFilter(playedCard, passive.summonFilter)
                ) {
                    continue;
                }
            } else if (
                (triggersOn === "TURN_END" ||
                    triggersOn === "TURN_BEGIN" ||
                    triggersOn === "DRAW" ||
                    triggersOn === "HERO_ATTACK") &&
                activePlayer &&
                owner !== activePlayer
            ) {
                continue;
            } else if (triggersOn === "DECK_CARD_ADD") {
                if (!event || event.type !== "DECK_CARD") continue;
            } else if ((triggersOn === "HEAL" || triggersOn === "DAMAGE") && event) {
                if (
                    !passiveTriggerEventMatchesFilter(
                        event,
                        passive.triggerTargetFilter ?? null,
                        owner,
                        game.data,
                        minion,
                    )
                ) {
                    continue;
                }
            }

            entries.push({
                passive,
                owner,
                sourceOwner,
                sourceMinionUuid: minion.uuid,
                sourceCard: {
                    cardId: card.cardId,
                    label: card.label,
                    uuid: card.uuid,
                },
            });
        }
    }

    return entries;
};

export const collectPassiveTriggers = (
    game: Game,
    triggersOn: PassiveTriggersOn,
    activePlayer?: GamePlayer,
    playedCard?: PlayerCard,
    event?: PassiveTriggerEvent,
): PassiveTriggerEntry[] => {
    const playerOne = game.data.playerOne;
    const playerTwo = game.data.playerTwo;

    const playerOneEntries = collectFromBoard(
        playerOne.board,
        playerOne,
        "PLAYER",
        triggersOn,
        game,
        activePlayer,
        playedCard,
        event,
    );
    const playerTwoEntries = collectFromBoard(
        playerTwo.board,
        playerTwo,
        "OPPONENT",
        triggersOn,
        game,
        activePlayer,
        playedCard,
        event,
    );

    return [...playerOneEntries, ...playerTwoEntries];
};
