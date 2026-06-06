import type { GamePlayer, TargetSnapshot } from "#api_types/game.types";

export const resolveHeroTargets = (
    target: TargetSnapshot,
    player: GamePlayer,
    opponent: GamePlayer,
): GamePlayer[] => {
    if (target.type !== "HERO") return [];

    if (target.targetTeam === "ALL") return [player, opponent];

    return [target.targetTeam === "PLAYER" ? player : opponent];
};

export const resolveHeroTarget = (
    target: TargetSnapshot,
    player: GamePlayer,
    opponent: GamePlayer,
): GamePlayer | null => {
    const targets = resolveHeroTargets(target, player, opponent);
    return targets[0] ?? null;
};
