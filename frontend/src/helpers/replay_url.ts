import type { ApiGameReplay } from "#api_types/game_replay.types";

export const parseReplayStep = (searchParams: URLSearchParams): number => {
    const raw = searchParams.get("step");
    if (raw === null) return 0;

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;

    return Math.floor(parsed);
};

export const clampReplayStep = (step: number, maxStepIndex: number): number =>
    Math.max(0, Math.min(step, maxStepIndex));

export const resolveReplayPerspectiveUserId = (
    pathUserId: number,
    replay: ApiGameReplay,
): number => {
    const playerIds = [replay.playerOne.userId, replay.playerTwo.userId];
    if (playerIds.includes(pathUserId)) return pathUserId;
    return replay.playerOne.userId;
};

export const buildReplaySearchParams = (stepIndex: number): URLSearchParams => {
    const params = new URLSearchParams();
    if (stepIndex > 0) params.set("step", String(stepIndex));
    return params;
};

export const getReplayPath = (userId: number, gameId: number, stepIndex = 0): string => {
    const params = buildReplaySearchParams(stepIndex);
    const query = params.toString();
    return `/game-history/${userId}/${gameId}/replay${query ? `?${query}` : ""}`;
};
