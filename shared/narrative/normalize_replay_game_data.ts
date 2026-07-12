import { migrateBoardIfNeeded } from "#api_types/board";
import type { GameData, GamePlayer } from "#api_types/game.types";
import { DEFAULT_PLAYER_STATS } from "#api_types/game.types";
import type { GamePresentationUpdate, NarrativeBeat } from "#api_types/game_narrative.types";

const normalizeGamePlayerForReplay = (player: GamePlayer): GamePlayer => {
    const { board } = migrateBoardIfNeeded(player.board);

    return {
        ...player,
        deckCards: player.deckCards ?? [],
        hand: player.hand ?? [],
        board,
        stats: player.stats ?? DEFAULT_PLAYER_STATS,
    };
};

export const normalizeGameDataForReplay = (data: GameData): GameData => ({
    ...data,
    actionLog: data.actionLog ?? [],
    playerOne: normalizeGamePlayerForReplay(data.playerOne),
    playerTwo: normalizeGamePlayerForReplay(data.playerTwo),
});

const normalizeBeatForReplay = (beat: NarrativeBeat): NarrativeBeat => ({
    ...beat,
    effects: beat.effects ?? [],
    stateAfter: normalizeGameDataForReplay(beat.stateAfter),
});

export const normalizePresentationForReplay = (
    presentation: GamePresentationUpdate,
): GamePresentationUpdate => ({
    ...presentation,
    stateBefore: normalizeGameDataForReplay(presentation.stateBefore),
    stateAfter: normalizeGameDataForReplay(presentation.stateAfter),
    beats: (presentation.beats ?? []).map(normalizeBeatForReplay),
});
