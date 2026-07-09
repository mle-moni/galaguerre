export interface SpectatorWatch {
    spectatorUserId: number;
    gameId: number;
    viewAsUserId: number;
}

const watchersBySpectatorUserId = new Map<number, SpectatorWatch>();

export const registerSpectatorWatch = (
    spectatorUserId: number,
    gameId: number,
    viewAsUserId: number,
): SpectatorWatch => {
    const watch: SpectatorWatch = { spectatorUserId, gameId, viewAsUserId };
    watchersBySpectatorUserId.set(spectatorUserId, watch);
    return watch;
};

export const unregisterSpectatorWatch = (spectatorUserId: number): void => {
    watchersBySpectatorUserId.delete(spectatorUserId);
};

export const getSpectatorWatch = (spectatorUserId: number): SpectatorWatch | null =>
    watchersBySpectatorUserId.get(spectatorUserId) ?? null;

export const getSpectatorsForGame = (gameId: number): SpectatorWatch[] =>
    [...watchersBySpectatorUserId.values()].filter((watch) => watch.gameId === gameId);
