import type { GamePlayer, MinionState, SpotOwner } from "#api_types/game.types";
import type { NarrativeEntityRef } from "#api_types/game_narrative.types";
import type Game from "#models/game";
import { withNarrativeRecorder } from "./narrative_context.js";

export const resolveSpotOwner = (game: Game, player: GamePlayer): SpotOwner =>
    player.userId === game.data.playerOne.userId ? "PLAYER" : "OPPONENT";

export const minionEntityRef = (minion: MinionState, owner: SpotOwner): NarrativeEntityRef => ({
    type: "MINION",
    cardUuid: minion.uuid,
    owner,
});

export const heroEntityRef = (owner: SpotOwner): NarrativeEntityRef => ({
    type: "HERO",
    owner,
});

export const recordSpendMana = (owner: SpotOwner, amount: number): void => {
    if (amount <= 0) return;

    withNarrativeRecorder((recorder) => {
        recorder.recordEffect({ type: "SPEND_MANA", owner, amount });
    });
};

export const recordGainMana = (owner: SpotOwner, amount: number): void => {
    if (amount <= 0) return;

    withNarrativeRecorder((recorder) => {
        recorder.recordEffect({ type: "GAIN_MANA", owner, amount });
    });
};

export const recordStatChange = (
    target: NarrativeEntityRef,
    deltas: { attackDelta?: number; healthDelta?: number },
): void => {
    if (deltas.attackDelta === undefined && deltas.healthDelta === undefined) return;

    withNarrativeRecorder((recorder) => {
        recorder.recordEffect({
            type: "STAT_CHANGE",
            target,
            ...deltas,
        });
    });
};
