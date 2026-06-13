import {
    MINION_SPOT_IDS,
    type GamePlayer,
    type MinionCard,
    type PassiveSnapshot,
    type PassiveTriggersOn,
    type PlayerCard,
    type SpotOwner,
} from "#api_types/game.types";
import { deckCardMatchesFilter } from "#api_types/card_filter_matching";
import type Game from "#models/game";

export interface PassiveTriggerEntry {
    passive: PassiveSnapshot;
    owner: GamePlayer;
    sourceOwner: SpotOwner;
    sourceSpotId: (typeof MINION_SPOT_IDS)[number];
}

const collectFromBoard = (
    board: GamePlayer["board"],
    owner: GamePlayer,
    sourceOwner: SpotOwner,
    triggersOn: PassiveTriggersOn,
    activePlayer?: GamePlayer,
    playedCard?: PlayerCard,
): PassiveTriggerEntry[] => {
    const entries: PassiveTriggerEntry[] = [];

    for (const spotId of MINION_SPOT_IDS) {
        const minion = board[spotId];
        if (!minion || minion.originalCard.type !== "MINION" || minion.isSilenced) continue;

        const card = minion.originalCard as MinionCard;
        for (const passive of card.passives ?? []) {
            if (passive.type !== "ACTION" || passive.triggersOn !== triggersOn) continue;
            if (!passive.action) continue;

            if (triggersOn === "PLAY_CARD") {
                if (!playedCard || !activePlayer || owner !== activePlayer) continue;
                if (
                    passive.playCardFilter !== null &&
                    !deckCardMatchesFilter(playedCard, passive.playCardFilter)
                ) {
                    continue;
                }
            } else if (
                (triggersOn === "TURN_END" ||
                    triggersOn === "TURN_BEGIN" ||
                    triggersOn === "DRAW") &&
                activePlayer &&
                owner !== activePlayer
            ) {
                continue;
            }

            entries.push({
                passive,
                owner,
                sourceOwner,
                sourceSpotId: spotId,
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
): PassiveTriggerEntry[] => {
    const playerOne = game.data.playerOne;
    const playerTwo = game.data.playerTwo;

    const playerOneEntries = collectFromBoard(
        playerOne.board,
        playerOne,
        "PLAYER",
        triggersOn,
        activePlayer,
        playedCard,
    );
    const playerTwoEntries = collectFromBoard(
        playerTwo.board,
        playerTwo,
        "OPPONENT",
        triggersOn,
        activePlayer,
        playedCard,
    );

    return [...playerOneEntries, ...playerTwoEntries];
};
