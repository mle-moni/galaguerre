import type { GameData, GamePlayer } from "#api_types/game.types";
import type { GamePresentationUpdate, NarrativeBeat } from "#api_types/game_narrative.types";

export interface CompactGamePresentationUpdate {
    updateId: string;
    stateBefore?: GameData;
    beats: NarrativeBeat[];
    stateAfter: GameData;
}

const stripEphemeralGameFields = (data: GameData): GameData => {
    const {
        turnEndsAt: _turnEndsAt,
        mulliganEndsAt: _mulliganEndsAt,
        ratingResult: _ratingResult,
        rewardResult: _rewardResult,
        ...rest
    } = data;

    return rest;
};

const stripBeatPlayerFields = (player: GamePlayer): GamePlayer => ({
    ...player,
    deckCards: [],
});

const compactGameDataForBeat = (data: GameData): GameData => ({
    ...stripEphemeralGameFields(data),
    actionLog: [],
    playerOne: stripBeatPlayerFields(data.playerOne),
    playerTwo: stripBeatPlayerFields(data.playerTwo),
});

const compactGameDataForStep = (data: GameData): GameData => stripEphemeralGameFields(data);

const mergePlayerDeckCards = (
    player: GamePlayer,
    deckCards: GamePlayer["deckCards"],
): GamePlayer => ({
    ...player,
    deckCards,
});

const expandBeatStateAfter = (beatStateAfter: GameData, stepStateAfter: GameData): GameData => ({
    ...beatStateAfter,
    actionLog: stepStateAfter.actionLog,
    playerOne: mergePlayerDeckCards(beatStateAfter.playerOne, stepStateAfter.playerOne.deckCards),
    playerTwo: mergePlayerDeckCards(beatStateAfter.playerTwo, stepStateAfter.playerTwo.deckCards),
});

export const compactReplayStep = (
    step: GamePresentationUpdate,
    stepIndex: number,
): CompactGamePresentationUpdate => ({
    updateId: step.updateId,
    ...(stepIndex === 0 ? { stateBefore: compactGameDataForStep(step.stateBefore) } : {}),
    beats: step.beats.map((beat) => ({
        ...beat,
        stateAfter: compactGameDataForBeat(beat.stateAfter),
    })),
    stateAfter: compactGameDataForStep(step.stateAfter),
});

export const expandReplayStep = (
    compact: CompactGamePresentationUpdate,
    previousStepStateAfter: GameData | null,
): GamePresentationUpdate => {
    const stateAfter = compact.stateAfter;

    return {
        updateId: compact.updateId,
        stateBefore:
            compact.stateBefore ??
            (previousStepStateAfter
                ? previousStepStateAfter
                : (() => {
                      throw new Error("First replay step must include stateBefore");
                  })()),
        beats: compact.beats.map((beat) => ({
            ...beat,
            stateAfter: expandBeatStateAfter(beat.stateAfter, stateAfter),
        })),
        stateAfter,
    };
};

export const expandReplaySteps = (
    compactSteps: CompactGamePresentationUpdate[],
): GamePresentationUpdate[] => {
    const expanded: GamePresentationUpdate[] = [];
    let previousStateAfter: GameData | null = null;

    for (const compact of compactSteps) {
        const step = expandReplayStep(compact, previousStateAfter);
        expanded.push(step);
        previousStateAfter = step.stateAfter;
    }

    return expanded;
};
