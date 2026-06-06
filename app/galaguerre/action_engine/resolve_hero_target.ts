import type { GamePlayer, TargetSnapshot } from "#api_types/game.types";

export const resolveHeroTarget = (
    target: TargetSnapshot,
    player: GamePlayer,
    opponent: GamePlayer,
): GamePlayer | null => {
    if (target.type !== "HERO") return null;

    return target.targetTeam === "PLAYER" ? player : opponent;
};
