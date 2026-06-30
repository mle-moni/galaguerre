import type { GamePresentationUpdate } from "#api_types/game_narrative.types";
import { REPLAY_FORMAT_VERSION, type GameReplayData } from "#api_types/game_replay.types";
import { compactReplayStep, expandReplaySteps } from "#galaguerre/game_replay/compact_replay_step";
import db from "@adonisjs/lucid/services/db";
import GameReplay from "#models/game_replay";
import GameReplayStep from "#models/game_replay_step";
import type Game from "#models/game";

const nextStepIndexByGame = new Map<number, number>();

const resolveNextStepIndex = async (gameId: number): Promise<number> => {
    const cached = nextStepIndexByGame.get(gameId);
    if (cached !== undefined) {
        nextStepIndexByGame.set(gameId, cached + 1);
        return cached;
    }

    const latest = await GameReplayStep.query()
        .where("gameId", gameId)
        .orderBy("stepIndex", "desc")
        .select("stepIndex")
        .first();

    const nextStepIndex = latest ? latest.stepIndex + 1 : 0;
    nextStepIndexByGame.set(gameId, nextStepIndex + 1);
    return nextStepIndex;
};

export const clearReplaySession = (gameId: number): void => {
    nextStepIndexByGame.delete(gameId);
};

export const persistReplayStep = async (
    game: Game,
    presentation: GamePresentationUpdate,
): Promise<void> => {
    if (!("$isPersisted" in game) || game.data.isTraining) {
        return;
    }

    const stepIndex = await resolveNextStepIndex(game.id);
    const compact = compactReplayStep(presentation, stepIndex);

    await db.transaction(async (trx) => {
        await GameReplay.updateOrCreate(
            { gameId: game.id },
            { version: REPLAY_FORMAT_VERSION },
            { client: trx },
        );

        await GameReplayStep.create(
            {
                gameId: game.id,
                stepIndex,
                data: compact,
            },
            { client: trx },
        );
    });
};

export const finalizeGameReplay = async (gameId: number): Promise<void> => {
    const stepCount = await GameReplayStep.query().where("gameId", gameId).count("* as total");
    const total = Number(stepCount[0]?.$extras.total ?? 0);

    if (total > 0) {
        const sizeResult = await db.rawQuery<{ rows: Array<{ total_bytes: string }> }>(
            "select coalesce(sum(pg_column_size(data)), 0) as total_bytes from game_replay_steps where game_id = ?",
            [gameId],
        );
        const totalBytes = Number(sizeResult.rows[0]?.total_bytes ?? 0);
        console.info(
            `Replay finalized for game ${gameId}: ${total} steps, ${(totalBytes / 1024).toFixed(1)} KB stored`,
        );
    }

    clearReplaySession(gameId);
};

export const gameHasReplayRecord = async (gameId: number): Promise<boolean> => {
    const record = await GameReplay.query().where("gameId", gameId).select("id").first();
    return record !== null;
};

export const loadGameReplayData = async (gameId: number): Promise<GameReplayData | null> => {
    const header = await GameReplay.findBy("gameId", gameId);
    if (!header) {
        return null;
    }

    const rows = await GameReplayStep.query().where("gameId", gameId).orderBy("stepIndex", "asc");

    if (rows.length === 0) {
        return null;
    }

    return {
        version: header.version ?? REPLAY_FORMAT_VERSION,
        steps: expandReplaySteps(rows.map((row) => row.data)),
    };
};

export const countReplaySteps = async (gameId: number): Promise<number> => {
    const result = await GameReplayStep.query().where("gameId", gameId).count("* as total");
    return Number(result[0]?.$extras.total ?? 0);
};
