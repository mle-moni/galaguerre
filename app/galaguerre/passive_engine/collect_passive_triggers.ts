import {
    MINION_SPOT_IDS,
    type GamePlayer,
    type MinionCard,
    type PassiveSnapshot,
    type PassiveTriggersOn,
    type SpotOwner,
} from "#api_types/game.types";
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
): PassiveTriggerEntry[] => {
    const entries: PassiveTriggerEntry[] = [];

    for (const spotId of MINION_SPOT_IDS) {
        const minion = board[spotId];
        if (!minion || minion.originalCard.type !== "MINION") continue;

        const card = minion.originalCard as MinionCard;
        for (const passive of card.passives ?? []) {
            if (passive.type !== "ACTION" || passive.triggersOn !== triggersOn) continue;
            if (!passive.action) continue;

            if (
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
): PassiveTriggerEntry[] => {
    const playerOne = game.data.playerOne;
    const playerTwo = game.data.playerTwo;

    const playerOneEntries = collectFromBoard(
        playerOne.board,
        playerOne,
        "PLAYER",
        triggersOn,
        activePlayer,
    );
    const playerTwoEntries = collectFromBoard(
        playerTwo.board,
        playerTwo,
        "OPPONENT",
        triggersOn,
        activePlayer,
    );

    return [...playerOneEntries, ...playerTwoEntries];
};
