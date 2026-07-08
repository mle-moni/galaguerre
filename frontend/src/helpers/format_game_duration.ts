export const getGameFinishedAt = (game: { endedAt: string | null; updatedAt: string }): string =>
    game.endedAt ?? game.updatedAt;

const formatDecimalSeconds = (seconds: number): string => seconds.toFixed(2).replace(".", ",");

export const formatSpeedrunDurationSeconds = (totalSeconds: number): string => {
    const seconds = Math.max(0, totalSeconds);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
        return `${hours} h ${minutes} m ${formatDecimalSeconds(remainingSeconds)} s`;
    }

    if (minutes > 0) {
        return `${minutes} m ${formatDecimalSeconds(remainingSeconds)} s`;
    }

    return `${formatDecimalSeconds(seconds)} s`;
};

export const formatDurationSeconds = (totalSeconds: number): string => {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
        return `${hours} h ${minutes} min`;
    }

    if (minutes > 0) {
        return `${minutes} min ${remainingSeconds} s`;
    }

    return `${remainingSeconds} s`;
};

export const formatGameDuration = (startedAt: string, finishedAt: string): string => {
    const totalSeconds = Math.floor(
        (new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000,
    );

    return formatDurationSeconds(totalSeconds);
};

export const formatGameSpeedrunDuration = (startedAt: string, finishedAt: string): string => {
    const totalSeconds = Math.max(
        0,
        (new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000,
    );

    return formatSpeedrunDurationSeconds(totalSeconds);
};
