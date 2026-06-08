export const getGameFinishedAt = (game: { endedAt: string | null; updatedAt: string }): string =>
    game.endedAt ?? game.updatedAt;

export const formatGameDuration = (startedAt: string, finishedAt: string): string => {
    const totalSeconds = Math.max(
        0,
        Math.floor((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000),
    );

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours} h ${minutes} min`;
    }

    if (minutes > 0) {
        return `${minutes} min ${seconds} s`;
    }

    return `${seconds} s`;
};
